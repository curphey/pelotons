/**
 * Social Features Types
 * User profiles, follows, invites, and activity feed
 */

// ============================================
// USER PROFILE
// ============================================

export type ActivityVisibility = 'public' | 'followers' | 'private';

export interface UserProfile {
  id: string;
  userId: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  location: string | null;
  activityVisibility: ActivityVisibility;
  showStats: boolean;
  followersCount: number;
  followingCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfileInsert {
  userId: string;
  username?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  location?: string | null;
  activityVisibility?: ActivityVisibility;
  showStats?: boolean;
}

export interface UserProfileUpdate {
  username?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  location?: string | null;
  activityVisibility?: ActivityVisibility;
  showStats?: boolean;
}

// ============================================
// USER ROLES
// ============================================

export type UserRole = 'admin' | 'moderator';

export interface UserRoleRecord {
  id: string;
  userId: string;
  role: UserRole;
  grantedBy: string | null;
  grantedAt: string;
}

// ============================================
// FOLLOWS
// ============================================

export interface Follow {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: string;
}

export interface FollowWithProfile extends Follow {
  followerProfile?: UserProfile;
  followingProfile?: UserProfile;
}

// ============================================
// INVITES
// ============================================

export type InviteStatus = 'pending' | 'accepted' | 'expired' | 'revoked';

export interface Invite {
  id: string;
  email: string;
  inviteCode: string;
  createdBy: string;
  status: InviteStatus;
  usedBy: string | null;
  usedAt: string | null;
  expiresAt: string;
  personalMessage: string | null;
  createdAt: string;
}

export interface InviteInsert {
  email: string;
  personalMessage?: string | null;
}

export interface InviteWithCreator extends Invite {
  creatorEmail?: string;
  creatorDisplayName?: string;
}

// ============================================
// ACTIVITIES
// ============================================

export type ActivityType = 'ride' | 'route_created';

export interface ActivitySummary {
  // For rides
  name?: string;
  distanceM?: number;
  durationS?: number;
  elevationGainM?: number;
}

export interface Activity {
  id: string;
  userId: string;
  activityType: ActivityType;
  rideId: string | null;
  routeId: string | null;
  summary: ActivitySummary;
  visibility: ActivityVisibility;
  occurredAt: string;
  createdAt: string;
}

export interface ActivityFeedItem extends Activity {
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
}

// ============================================
// ADMIN TYPES
// ============================================

export interface UserWithProfile {
  id: string;
  email: string;
  createdAt: string;
  lastSignInAt: string | null;
  profile: UserProfile | null;
  roles: UserRole[];
}

export interface AdminUserListResponse {
  users: UserWithProfile[];
  total: number;
}

export interface AdminInviteListResponse {
  invites: InviteWithCreator[];
}

// ============================================
// DB MAPPING HELPERS
// ============================================

export interface DbUserProfile {
  id: string;
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  activity_visibility: string;
  show_stats: boolean;
  followers_count: number;
  following_count: number;
  created_at: string;
  updated_at: string;
}

export interface DbFollow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}

export interface DbInvite {
  id: string;
  email: string;
  invite_code: string;
  created_by: string;
  status: string;
  used_by: string | null;
  used_at: string | null;
  expires_at: string;
  personal_message: string | null;
  created_at: string;
}

export interface DbActivity {
  id: string;
  user_id: string;
  activity_type: string;
  ride_id: string | null;
  route_id: string | null;
  summary: Record<string, unknown>;
  visibility: string;
  occurred_at: string;
  created_at: string;
}

export interface DbUserRole {
  id: string;
  user_id: string;
  role: string;
  granted_by: string | null;
  granted_at: string;
}

// Mapping functions
export function mapDbToUserProfile(db: DbUserProfile): UserProfile {
  return {
    id: db.id,
    userId: db.user_id,
    username: db.username,
    displayName: db.display_name,
    avatarUrl: db.avatar_url,
    bio: db.bio,
    location: db.location,
    activityVisibility: db.activity_visibility as ActivityVisibility,
    showStats: db.show_stats,
    followersCount: db.followers_count,
    followingCount: db.following_count,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

export function mapDbToFollow(db: DbFollow): Follow {
  return {
    id: db.id,
    followerId: db.follower_id,
    followingId: db.following_id,
    createdAt: db.created_at,
  };
}

export function mapDbToInvite(db: DbInvite): Invite {
  return {
    id: db.id,
    email: db.email,
    inviteCode: db.invite_code,
    createdBy: db.created_by,
    status: db.status as InviteStatus,
    usedBy: db.used_by,
    usedAt: db.used_at,
    expiresAt: db.expires_at,
    personalMessage: db.personal_message,
    createdAt: db.created_at,
  };
}

export function mapDbToActivity(db: DbActivity): Activity {
  return {
    id: db.id,
    userId: db.user_id,
    activityType: db.activity_type as ActivityType,
    rideId: db.ride_id,
    routeId: db.route_id,
    summary: db.summary as ActivitySummary,
    visibility: db.visibility as ActivityVisibility,
    occurredAt: db.occurred_at,
    createdAt: db.created_at,
  };
}

export function mapDbToActivityFeedItem(
  db: DbActivity & { display_name: string | null; username: string | null; avatar_url: string | null }
): ActivityFeedItem {
  return {
    ...mapDbToActivity(db),
    displayName: db.display_name,
    username: db.username,
    avatarUrl: db.avatar_url,
  };
}
