import { Link } from 'react-router-dom';
import { ActivityFeedItem } from '@peloton/shared';

interface ActivityCardProps {
  activity: ActivityFeedItem;
}

export function ActivityCard({ activity }: ActivityCardProps) {
  const formatDistance = (meters: number) => {
    const km = meters / 1000;
    return km >= 1 ? `${km.toFixed(1)} km` : `${meters} m`;
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatElevation = (meters: number) => {
    return `${Math.round(meters)} m`;
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const renderActivityContent = () => {
    if (activity.activityType === 'ride') {
      return (
        <>
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            <span className="text-sm text-gray-600">completed a ride</span>
          </div>

          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            {activity.summary.name || 'Untitled Ride'}
          </h3>

          <div className="grid grid-cols-3 gap-4">
            {activity.summary.distanceM && (
              <div>
                <div className="text-lg font-bold text-gray-900">
                  {formatDistance(activity.summary.distanceM)}
                </div>
                <div className="text-xs text-gray-500">Distance</div>
              </div>
            )}
            {activity.summary.durationS && (
              <div>
                <div className="text-lg font-bold text-gray-900">
                  {formatDuration(activity.summary.durationS)}
                </div>
                <div className="text-xs text-gray-500">Duration</div>
              </div>
            )}
            {activity.summary.elevationGainM && (
              <div>
                <div className="text-lg font-bold text-gray-900">
                  {formatElevation(activity.summary.elevationGainM)}
                </div>
                <div className="text-xs text-gray-500">Elevation</div>
              </div>
            )}
          </div>
        </>
      );
    }

    if (activity.activityType === 'route_created') {
      return (
        <>
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
              />
            </svg>
            <span className="text-sm text-gray-600">created a new route</span>
          </div>

          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            {activity.summary.name || 'Untitled Route'}
          </h3>

          <div className="grid grid-cols-2 gap-4">
            {activity.summary.distanceM && (
              <div>
                <div className="text-lg font-bold text-gray-900">
                  {formatDistance(activity.summary.distanceM)}
                </div>
                <div className="text-xs text-gray-500">Distance</div>
              </div>
            )}
            {activity.summary.elevationGainM && (
              <div>
                <div className="text-lg font-bold text-gray-900">
                  {formatElevation(activity.summary.elevationGainM)}
                </div>
                <div className="text-xs text-gray-500">Elevation</div>
              </div>
            )}
          </div>

          {activity.routeId && (
            <Link
              to={`/routes/${activity.routeId}`}
              className="mt-4 inline-flex items-center text-sm text-blue-600 hover:text-blue-700"
            >
              View route
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          )}
        </>
      );
    }

    return null;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
            {activity.avatarUrl ? (
              <img src={activity.avatarUrl} alt="" className="h-10 w-10 object-cover" />
            ) : (
              <span className="text-gray-500 font-medium">
                {(activity.displayName || activity.username || '?')[0].toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <Link
              to={activity.username ? `/users/${activity.username}` : '#'}
              className="font-medium text-gray-900 hover:text-blue-600"
            >
              {activity.displayName || activity.username || 'Unknown User'}
            </Link>
            {activity.username && (
              <div className="text-sm text-gray-500">@{activity.username}</div>
            )}
          </div>
        </div>
        <div className="text-sm text-gray-500">{getTimeAgo(activity.occurredAt)}</div>
      </div>

      {/* Content */}
      {renderActivityContent()}
    </div>
  );
}
