import { useState } from 'react';
import { useRwgps } from '@/hooks/useRwgps';

export function RwgpsConnection() {
  const { connection, loading, error, connect, disconnect, clearError } = useRwgps();
  const [disconnecting, setDisconnecting] = useState(false);

  const handleConnect = () => {
    clearError();
    connect();
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect from RideWithGPS?')) {
      return;
    }

    setDisconnecting(true);
    try {
      await disconnect();
    } finally {
      setDisconnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
          <span className="text-gray-600">Checking connection...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-4">
          {/* RWGPS Logo placeholder */}
          <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
            <svg
              className="w-8 h-8 text-orange-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900">RideWithGPS</h3>
            <p className="text-sm text-gray-500">
              Sync routes and collections with your RideWithGPS account
            </p>
          </div>
        </div>

        {connection?.connected ? (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Connected
          </span>
        ) : (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
            Not connected
          </span>
        )}
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {connection?.connected ? (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">
                Connected as{' '}
                <span className="font-medium text-gray-900">
                  {connection.username || 'Unknown'}
                </span>
              </p>
              {connection.connectedAt && (
                <p className="text-xs text-gray-400 mt-1">
                  Connected {new Date(connection.connectedAt).toLocaleDateString()}
                </p>
              )}
            </div>
            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
            >
              {disconnecting ? 'Disconnecting...' : 'Disconnect'}
            </button>
          </div>

          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              You can now import routes from RideWithGPS or push your local routes to your RWGPS account.
              Go to the Routes page to sync your routes.
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-sm text-gray-600 mb-4">
            Connect your RideWithGPS account to sync routes and collections between Peloton and RWGPS.
          </p>
          <button
            onClick={handleConnect}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors"
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
              />
            </svg>
            Connect to RideWithGPS
          </button>
        </div>
      )}
    </div>
  );
}
