-- ============================================
-- MULTI-USER SOCIAL FEATURES
-- Migration 011: Helper functions and RLS policies
-- ============================================

-- ============================================
-- HELPER FUNCTIONS FOR RLS
-- ============================================

-- Check if user is admin
CREATE OR REPLACE FUNCTION is_admin(check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = check_user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if user follows another user
CREATE OR REPLACE FUNCTION is_following(follower UUID, target UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM follows
    WHERE follower_id = follower AND following_id = target
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if user can view activity based on visibility
CREATE OR REPLACE FUNCTION can_view_activity(viewer_id UUID, activity_user_id UUID, activity_visibility TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Always can view own activities
  IF viewer_id = activity_user_id THEN RETURN true; END IF;

  -- Admins can view all
  IF is_admin(viewer_id) THEN RETURN true; END IF;

  -- Check visibility setting
  IF activity_visibility = 'public' THEN RETURN true; END IF;
  IF activity_visibility = 'followers' AND is_following(viewer_id, activity_user_id) THEN RETURN true; END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- USER PROFILES RLS
-- Basic info always visible, users can edit own
-- ============================================
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Everyone can view profiles (basic info always visible per requirements)
CREATE POLICY "Anyone can view profiles"
  ON user_profiles FOR SELECT
  USING (true);

-- Users can create their own profile (handled by trigger, but allow manual)
CREATE POLICY "Users can create own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update own profile
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins can update any profile
CREATE POLICY "Admins can update any profile"
  ON user_profiles FOR UPDATE
  USING (is_admin());

-- Users can delete own profile
CREATE POLICY "Users can delete own profile"
  ON user_profiles FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- USER ROLES RLS
-- Anyone can read, only admins can write
-- ============================================
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Anyone can see roles (needed for UI to check admin status)
CREATE POLICY "Anyone can view roles"
  ON user_roles FOR SELECT
  USING (true);

-- Only admins can manage roles
CREATE POLICY "Admins can insert roles"
  ON user_roles FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update roles"
  ON user_roles FOR UPDATE
  USING (is_admin());

CREATE POLICY "Admins can delete roles"
  ON user_roles FOR DELETE
  USING (is_admin());

-- ============================================
-- FOLLOWS RLS
-- Anyone can read, users manage their own follows
-- ============================================
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

-- Anyone can see follow relationships
CREATE POLICY "Anyone can view follows"
  ON follows FOR SELECT
  USING (true);

-- Users can follow others
CREATE POLICY "Users can create follows"
  ON follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

-- Users can unfollow (delete their own follows)
CREATE POLICY "Users can delete own follows"
  ON follows FOR DELETE
  USING (auth.uid() = follower_id);

-- ============================================
-- INVITES RLS
-- Admins can CRUD, users can see their created invites
-- ============================================
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

-- Users can see invites they created
CREATE POLICY "Users can view own created invites"
  ON invites FOR SELECT
  USING (auth.uid() = created_by);

-- Admins can view all invites
CREATE POLICY "Admins can view all invites"
  ON invites FOR SELECT
  USING (is_admin());

-- Only admins can create invites
CREATE POLICY "Admins can create invites"
  ON invites FOR INSERT
  WITH CHECK (is_admin());

-- Only admins can update invites (revoke, etc.)
CREATE POLICY "Admins can update invites"
  ON invites FOR UPDATE
  USING (is_admin());

-- Only admins can delete invites
CREATE POLICY "Admins can delete invites"
  ON invites FOR DELETE
  USING (is_admin());

-- ============================================
-- ACTIVITIES RLS
-- Visibility-based access
-- ============================================
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- Users can view activities based on visibility settings
CREATE POLICY "View activities based on visibility"
  ON activities FOR SELECT
  USING (can_view_activity(auth.uid(), user_id, visibility));

-- System creates activities via triggers, users can for their own
CREATE POLICY "Users can create own activities"
  ON activities FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update visibility of own activities
CREATE POLICY "Users can update own activities"
  ON activities FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete own activities
CREATE POLICY "Users can delete own activities"
  ON activities FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- SEED INITIAL ADMIN
-- Note: This inserts admin role for mark@pelotons.cc
-- The user must already exist in auth.users
-- ============================================
DO $$
BEGIN
  -- Only insert if the user exists and doesn't already have admin role
  INSERT INTO user_roles (user_id, role, granted_by)
  SELECT id, 'admin', id
  FROM auth.users
  WHERE email = 'mark@pelotons.cc'
  ON CONFLICT (user_id, role) DO NOTHING;
END $$;
