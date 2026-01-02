import { useState, useEffect, useCallback } from 'react';
import { useRwgps } from '@/hooks/useRwgps';
import { useRoutes } from '@/hooks/useRoutes';
import { RwgpsRoute, Route } from '@peloton/shared';

interface RwgpsImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImported?: (route: Route) => void;
  existingRwgpsIds: number[]; // IDs of routes already imported
}

export function RwgpsImportModal({
  isOpen,
  onClose,
  onImported,
  existingRwgpsIds,
}: RwgpsImportModalProps) {
  const { connection, listRwgpsRoutes, importRoute } = useRwgps();
  const { createRoute } = useRoutes();

  const [routes, setRoutes] = useState<RwgpsRoute[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchRoutes = useCallback(async () => {
    if (!connection?.connected) return;

    setLoading(true);
    setError(null);

    try {
      const response = await listRwgpsRoutes(page, 20);
      setRoutes(response.results || []);
      setTotalPages(response.page_count || 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch routes');
    } finally {
      setLoading(false);
    }
  }, [connection?.connected, listRwgpsRoutes, page]);

  useEffect(() => {
    if (isOpen && connection?.connected) {
      fetchRoutes();
    }
  }, [isOpen, connection?.connected, fetchRoutes]);

  const handleImport = async (rwgpsRoute: RwgpsRoute) => {
    setImporting(rwgpsRoute.id);
    setError(null);

    try {
      const newRoute = await importRoute(rwgpsRoute.id, createRoute);
      if (newRoute && onImported) {
        onImported(newRoute);
      }
      // Refresh to update the "already imported" status
      fetchRoutes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import route');
    } finally {
      setImporting(null);
    }
  };

  const filteredRoutes = routes.filter((route) =>
    searchQuery
      ? route.name.toLowerCase().includes(searchQuery.toLowerCase())
      : true
  );

  const formatDistance = (meters: number): string => {
    const km = meters / 1000;
    return `${km.toFixed(1)} km`;
  };

  const formatElevation = (meters: number): string => {
    return `${Math.round(meters)} m`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
          {/* Header */}
          <div className="border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-orange-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    Import from RideWithGPS
                  </h3>
                  <p className="text-sm text-gray-500">
                    Select routes to import to Peloton
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="px-6 py-3 border-b border-gray-200">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search routes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Content */}
          <div className="max-h-96 overflow-y-auto">
            {!connection?.connected ? (
              <div className="px-6 py-8 text-center">
                <p className="text-gray-600">
                  Please connect to RideWithGPS in Settings first.
                </p>
              </div>
            ) : loading ? (
              <div className="px-6 py-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto" />
                <p className="mt-2 text-gray-600">Loading routes...</p>
              </div>
            ) : error ? (
              <div className="px-6 py-8 text-center">
                <p className="text-red-600">{error}</p>
                <button
                  onClick={fetchRoutes}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-700"
                >
                  Try again
                </button>
              </div>
            ) : filteredRoutes.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <p className="text-gray-600">
                  {searchQuery ? 'No routes match your search.' : 'No routes found in your RideWithGPS account.'}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {filteredRoutes.map((route) => {
                  const isImported = existingRwgpsIds.includes(route.id);
                  const isImporting = importing === route.id;

                  return (
                    <li key={route.id} className="px-6 py-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {route.name}
                          </p>
                          <div className="flex items-center space-x-4 mt-1">
                            <span className="text-xs text-gray-500">
                              {formatDistance(route.distance)}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatElevation(route.elevationGain)} gain
                            </span>
                            <span className="text-xs text-gray-400">
                              {new Date(route.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        {isImported ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            Imported
                          </span>
                        ) : (
                          <button
                            onClick={() => handleImport(route)}
                            disabled={isImporting}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-lg text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {isImporting ? (
                              <>
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1" />
                                Importing...
                              </>
                            ) : (
                              <>
                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                </svg>
                                Import
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="border-t border-gray-200 px-6 py-3 flex items-center justify-between">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || loading}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}

          {/* Footer */}
          <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
