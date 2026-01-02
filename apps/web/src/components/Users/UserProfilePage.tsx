import { useParams } from 'react-router-dom';
import { useUserProfileByUsername } from '@/hooks/useUserProfile';
import { useFollow, useFollowers, useFollowing } from '@/hooks/useFollow';
import { useActivityFeed } from '@/hooks/useActivityFeed';
import { useAuth } from '@/components/Auth/AuthProvider';
import { ActivityCard } from '@/components/Feed/ActivityCard';
import { useState } from 'react';

export function UserProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuth();
  const { profile, loading: profileLoading, error: profileError } = useUserProfileByUsername(username || '');
  const { isFollowing, loading: followLoading, toggleFollow } = useFollow(profile?.userId);
  const { followers } = useFollowers(profile?.userId);
  const { following } = useFollowing(profile?.userId);
  const { activities, loading: activitiesLoading, hasMore, loadMore, loadingMore } = useActivityFeed({
    userId: profile?.userId,
    pageSize: 10,
  });

  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);

  const isOwnProfile = user?.id === profile?.userId;

  if (profileLoading) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-24 w-24 bg-gray-200 rounded-full" />
            <div className="space-y-2 flex-1">
              <div className="h-6 bg-gray-200 rounded w-1/3" />
              <div className="h-4 bg-gray-200 rounded w-1/4" />
            </div>
          </div>
          <div className="h-20 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (profileError || !profile) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="text-center py-12">
          <svg
            className="w-16 h-16 mx-auto text-gray-300 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">User not found</h3>
          <p className="text-gray-500">
            The user @{username} doesn't exist or their profile is not available.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Profile Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-start gap-6">
          {/* Avatar */}
          <div className="h-24 w-24 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt="" className="h-24 w-24 object-cover" />
            ) : (
              <span className="text-3xl text-gray-500 font-medium">
                {(profile.displayName || profile.username || '?')[0].toUpperCase()}
              </span>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {profile.displayName || profile.username || 'Unknown User'}
                </h1>
                {profile.username && (
                  <p className="text-gray-500">@{profile.username}</p>
                )}
              </div>

              {!isOwnProfile && user && (
                <button
                  onClick={toggleFollow}
                  disabled={followLoading}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${
                    isFollowing
                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {followLoading ? '...' : isFollowing ? 'Following' : 'Follow'}
                </button>
              )}
            </div>

            {profile.bio && (
              <p className="mt-3 text-gray-700">{profile.bio}</p>
            )}

            {profile.location && (
              <div className="mt-2 flex items-center gap-1 text-sm text-gray-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                {profile.location}
              </div>
            )}

            {/* Stats */}
            <div className="mt-4 flex gap-6">
              <button
                onClick={() => setShowFollowers(true)}
                className="text-center hover:text-blue-600 transition-colors"
              >
                <div className="text-lg font-bold text-gray-900">{profile.followersCount}</div>
                <div className="text-sm text-gray-500">Followers</div>
              </button>
              <button
                onClick={() => setShowFollowing(true)}
                className="text-center hover:text-blue-600 transition-colors"
              >
                <div className="text-lg font-bold text-gray-900">{profile.followingCount}</div>
                <div className="text-sm text-gray-500">Following</div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Activities */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
      </div>

      {activitiesLoading && activities.length === 0 ? (
        <div className="animate-pulse space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-40 bg-gray-200 rounded" />
          ))}
        </div>
      ) : activities.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          {profile.activityVisibility === 'private'
            ? "This user's activities are private"
            : profile.activityVisibility === 'followers' && !isFollowing && !isOwnProfile
            ? 'Follow this user to see their activities'
            : 'No activities yet'}
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {activities.map((activity) => (
              <ActivityCard key={activity.id} activity={activity} />
            ))}
          </div>

          {hasMore && (
            <div className="mt-6 text-center">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                {loadingMore ? 'Loading...' : 'Load more'}
              </button>
            </div>
          )}
        </>
      )}

      {/* Followers Modal */}
      {showFollowers && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Followers</h3>
              <button onClick={() => setShowFollowers(false)} className="text-gray-500 hover:text-gray-700">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto max-h-96">
              {followers.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No followers yet</div>
              ) : (
                <ul className="divide-y">
                  {followers.map((follower) => (
                    <li key={follower.id} className="p-4 flex items-center gap-3 hover:bg-gray-50">
                      <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                        {follower.avatarUrl ? (
                          <img src={follower.avatarUrl} alt="" className="h-10 w-10 rounded-full" />
                        ) : (
                          <span className="text-gray-500 font-medium">
                            {(follower.displayName || follower.username || '?')[0].toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {follower.displayName || follower.username}
                        </div>
                        {follower.username && (
                          <div className="text-sm text-gray-500">@{follower.username}</div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Following Modal */}
      {showFollowing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Following</h3>
              <button onClick={() => setShowFollowing(false)} className="text-gray-500 hover:text-gray-700">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto max-h-96">
              {following.length === 0 ? (
                <div className="p-8 text-center text-gray-500">Not following anyone yet</div>
              ) : (
                <ul className="divide-y">
                  {following.map((followed) => (
                    <li key={followed.id} className="p-4 flex items-center gap-3 hover:bg-gray-50">
                      <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                        {followed.avatarUrl ? (
                          <img src={followed.avatarUrl} alt="" className="h-10 w-10 rounded-full" />
                        ) : (
                          <span className="text-gray-500 font-medium">
                            {(followed.displayName || followed.username || '?')[0].toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {followed.displayName || followed.username}
                        </div>
                        {followed.username && (
                          <div className="text-sm text-gray-500">@{followed.username}</div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
