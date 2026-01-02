-- ============================================
-- MULTI-USER SOCIAL FEATURES
-- Migration 010: Tables, triggers, indexes
-- ============================================

-- ============================================
-- USER PROFILES TABLE
-- Public profile info extending auth.users
-- ============================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Public profile fields
  username TEXT UNIQUE,  -- Optional unique handle like @username
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  location TEXT,

  -- Privacy settings (basic info always visible per requirements)
  activity_visibility TEXT NOT NULL DEFAULT 'followers'
    CHECK (activity_visibility IN ('public', 'followers', 'private')),
  show_stats BOOLEAN NOT NULL DEFAULT true,

  -- Social stats (denormalized for performance)
  followers_count INTEGER NOT NULL DEFAULT 0,
  following_count INTEGER NOT NULL DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_user_profile UNIQUE (user_id)
);

COMMENT ON TABLE user_profiles IS 'Public profile information for social features';
COMMENT ON COLUMN user_profiles.activity_visibility IS 'Who can see activities in feed: public (anyone), followers (only followers), private (only self)';
COMMENT ON COLUMN user_profiles.show_stats IS 'Whether to show ride/route stats on public profile';

-- ============================================
-- USER ROLES TABLE
-- Admin and moderator permissions
-- ============================================
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'moderator')),
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_user_role UNIQUE (user_id, role)
);

COMMENT ON TABLE user_roles IS 'User role assignments for admin/moderator permissions';

-- ============================================
-- FOLLOWS TABLE
-- Follow relationships between users
-- ============================================
CREATE TABLE IF NOT EXISTS follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevent self-follows and duplicates
  CONSTRAINT no_self_follow CHECK (follower_id != following_id),
  CONSTRAINT unique_follow UNIQUE (follower_id, following_id)
);

COMMENT ON TABLE follows IS 'Follow relationships between users (Strava-style)';
COMMENT ON COLUMN follows.follower_id IS 'The user who is following';
COMMENT ON COLUMN follows.following_id IS 'The user being followed';

-- ============================================
-- INVITES TABLE
-- Invite-only registration for private beta
-- ============================================
CREATE TABLE IF NOT EXISTS invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  invite_code TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  used_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),

  -- Metadata
  personal_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE invites IS 'Invite codes for private beta registration';

-- ============================================
-- ACTIVITIES TABLE
-- Activity feed items (rides + routes)
-- ============================================
CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Activity type and reference
  activity_type TEXT NOT NULL
    CHECK (activity_type IN ('ride', 'route_created')),

  -- Reference to the actual entity (polymorphic)
  ride_id UUID REFERENCES rides(id) ON DELETE CASCADE,
  route_id UUID REFERENCES routes(id) ON DELETE CASCADE,

  -- Denormalized data for feed display (avoids JOINs)
  summary JSONB NOT NULL DEFAULT '{}',

  -- Visibility (inherits from user's activity_visibility by default)
  visibility TEXT NOT NULL DEFAULT 'followers'
    CHECK (visibility IN ('public', 'followers', 'private')),

  -- Timestamps
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE activities IS 'Activity feed items for social features';
COMMENT ON COLUMN activities.summary IS 'Denormalized data like ride name, distance, etc. for efficient feed rendering';

-- ============================================
-- INDEXES
-- ============================================

-- User profiles
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_user_profiles_username ON user_profiles(username) WHERE username IS NOT NULL;

-- User roles
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role);

-- Follows
CREATE INDEX idx_follows_follower_id ON follows(follower_id);
CREATE INDEX idx_follows_following_id ON follows(following_id);
CREATE INDEX idx_follows_created_at ON follows(created_at DESC);

-- Invites
CREATE INDEX idx_invites_email ON invites(email);
CREATE INDEX idx_invites_code ON invites(invite_code);
CREATE INDEX idx_invites_created_by ON invites(created_by);
CREATE INDEX idx_invites_status ON invites(status);

-- Activities (critical for feed performance)
CREATE INDEX idx_activities_user_id ON activities(user_id);
CREATE INDEX idx_activities_occurred_at ON activities(occurred_at DESC);
CREATE INDEX idx_activities_type ON activities(activity_type);
CREATE INDEX idx_activities_feed ON activities(user_id, visibility, occurred_at DESC);

-- ============================================
-- UPDATED_AT TRIGGER FOR USER_PROFILES
-- ============================================
CREATE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- FOLLOWER COUNT TRIGGERS
-- Automatically maintain denormalized counts
-- ============================================
CREATE OR REPLACE FUNCTION update_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment counts
    UPDATE user_profiles SET following_count = following_count + 1
      WHERE user_id = NEW.follower_id;
    UPDATE user_profiles SET followers_count = followers_count + 1
      WHERE user_id = NEW.following_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement counts
    UPDATE user_profiles SET following_count = GREATEST(following_count - 1, 0)
      WHERE user_id = OLD.follower_id;
    UPDATE user_profiles SET followers_count = GREATEST(followers_count - 1, 0)
      WHERE user_id = OLD.following_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER follows_count_trigger
  AFTER INSERT OR DELETE ON follows
  FOR EACH ROW EXECUTE FUNCTION update_follow_counts();

-- ============================================
-- AUTO-CREATE USER PROFILE ON SIGNUP
-- ============================================
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_user_profile();

-- ============================================
-- AUTO-CREATE ACTIVITY ON RIDE COMPLETION
-- ============================================
CREATE OR REPLACE FUNCTION create_ride_activity()
RETURNS TRIGGER AS $$
DECLARE
  user_visibility TEXT;
BEGIN
  -- Get user's default activity visibility
  SELECT activity_visibility INTO user_visibility
  FROM user_profiles WHERE user_id = NEW.user_id;

  INSERT INTO activities (
    user_id,
    activity_type,
    ride_id,
    visibility,
    occurred_at,
    summary
  )
  VALUES (
    NEW.user_id,
    'ride',
    NEW.id,
    COALESCE(user_visibility, 'followers'),
    COALESCE(NEW.started_at, NOW()),
    jsonb_build_object(
      'name', NEW.name,
      'distanceM', NEW.distance_m,
      'durationS', NEW.duration_s,
      'elevationGainM', NEW.elevation_gain_m
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_ride_created
  AFTER INSERT ON rides
  FOR EACH ROW EXECUTE FUNCTION create_ride_activity();

-- ============================================
-- AUTO-CREATE ACTIVITY ON ROUTE CREATION
-- ============================================
CREATE OR REPLACE FUNCTION create_route_activity()
RETURNS TRIGGER AS $$
DECLARE
  user_visibility TEXT;
BEGIN
  -- Get user's default activity visibility
  SELECT activity_visibility INTO user_visibility
  FROM user_profiles WHERE user_id = NEW.user_id;

  INSERT INTO activities (
    user_id,
    activity_type,
    route_id,
    visibility,
    occurred_at,
    summary
  )
  VALUES (
    NEW.user_id,
    'route_created',
    NEW.id,
    COALESCE(user_visibility, 'followers'),
    NOW(),
    jsonb_build_object(
      'name', NEW.name,
      'distanceM', NEW.distance_m,
      'elevationGainM', NEW.elevation_gain_m
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_route_created
  AFTER INSERT ON routes
  FOR EACH ROW EXECUTE FUNCTION create_route_activity();

-- ============================================
-- ACTIVITY FEED FUNCTION
-- Get personalized feed for a user
-- ============================================
CREATE OR REPLACE FUNCTION get_activity_feed(
  feed_user_id UUID,
  page_size INTEGER DEFAULT 20,
  before_timestamp TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  activity_type TEXT,
  ride_id UUID,
  route_id UUID,
  summary JSONB,
  visibility TEXT,
  occurred_at TIMESTAMPTZ,
  display_name TEXT,
  username TEXT,
  avatar_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.user_id,
    a.activity_type,
    a.ride_id,
    a.route_id,
    a.summary,
    a.visibility,
    a.occurred_at,
    up.display_name,
    up.username,
    up.avatar_url
  FROM activities a
  JOIN user_profiles up ON up.user_id = a.user_id
  WHERE (
    -- Include own activities
    a.user_id = feed_user_id
    -- Include public activities
    OR a.visibility = 'public'
    -- Include activities from followed users (if visibility allows)
    OR (
      a.visibility = 'followers'
      AND EXISTS (
        SELECT 1 FROM follows
        WHERE follower_id = feed_user_id AND following_id = a.user_id
      )
    )
  )
  AND (before_timestamp IS NULL OR a.occurred_at < before_timestamp)
  ORDER BY a.occurred_at DESC
  LIMIT page_size;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
