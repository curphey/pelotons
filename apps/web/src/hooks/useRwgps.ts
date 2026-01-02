import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/Auth/AuthProvider';
import {
  Route,
  RwgpsRoute,
  RwgpsCollection,
  RwgpsSyncStatus,
} from '@peloton/shared';

// Get the Supabase functions URL from environment
const FUNCTIONS_URL = import.meta.env.SUPABASE_URL?.replace('.supabase.co', '.functions.supabase.co') || '';

interface RwgpsRoutesResponse {
  results: RwgpsRoute[];
  results_count: number;
  page_count: number;
  page_size: number;
  next_page_url: string | null;
}

interface RwgpsCollectionsResponse {
  results: RwgpsCollection[];
  results_count: number;
  page_count: number;
  page_size: number;
  next_page_url: string | null;
}

interface ConnectionState {
  connected: boolean;
  username: string | null;
  connectedAt: string | null;
}

export function useRwgps() {
  const { user, session } = useAuth();
  const [connection, setConnection] = useState<ConnectionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Helper to call edge function
  const callFunction = useCallback(async (
    action: string,
    params: Record<string, string> = {},
    body?: Record<string, unknown>
  ) => {
    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }

    const queryParams = new URLSearchParams({ action, ...params });
    const url = `${FUNCTIONS_URL}/rwgps-proxy?${queryParams}`;

    const response = await fetch(url, {
      method: body ? 'POST' : 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }

    return data;
  }, [session?.access_token]);

  // Fetch connection status
  const fetchConnection = useCallback(async () => {
    if (!user || !session) {
      setConnection(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await callFunction('get-connection');
      setConnection({
        connected: data.connected,
        username: data.username,
        connectedAt: data.connectedAt,
      });
    } catch (err) {
      console.error('Failed to fetch RWGPS connection:', err);
      setConnection({ connected: false, username: null, connectedAt: null });
    } finally {
      setLoading(false);
    }
  }, [user, session, callFunction]);

  useEffect(() => {
    fetchConnection();
  }, [fetchConnection]);

  // Generate OAuth URL and redirect
  const connect = useCallback(async () => {
    if (!user) {
      setError('Must be logged in to connect');
      return;
    }

    try {
      // The redirect URI should point back to our app
      const redirectUri = `${window.location.origin}/settings/rwgps/callback`;

      // Generate a random state for CSRF protection
      const state = crypto.randomUUID();
      sessionStorage.setItem('rwgps_oauth_state', state);
      sessionStorage.setItem('rwgps_redirect_uri', redirectUri);

      const data = await callFunction('get-auth-url', {
        redirect_uri: redirectUri,
        state,
      });

      // Redirect to RWGPS OAuth page
      window.location.href = data.authUrl;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect';
      setError(message);
    }
  }, [user, callFunction]);

  // Handle OAuth callback (called from callback page)
  const handleOAuthCallback = useCallback(async (code: string, state: string) => {
    const savedState = sessionStorage.getItem('rwgps_oauth_state');
    const redirectUri = sessionStorage.getItem('rwgps_redirect_uri');

    // Clean up session storage
    sessionStorage.removeItem('rwgps_oauth_state');
    sessionStorage.removeItem('rwgps_redirect_uri');

    if (state !== savedState) {
      throw new Error('Invalid OAuth state - possible CSRF attack');
    }

    if (!redirectUri || !user) {
      throw new Error('Missing required OAuth data');
    }

    // Exchange code for tokens via edge function
    const queryParams = new URLSearchParams({
      action: 'oauth-callback',
      code,
      redirect_uri: redirectUri,
      user_id: user.id,
    });

    const response = await fetch(`${FUNCTIONS_URL}/rwgps-proxy?${queryParams}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'OAuth callback failed');
    }

    // Refresh connection state
    await fetchConnection();

    return data;
  }, [user, fetchConnection]);

  // Disconnect from RWGPS
  const disconnect = useCallback(async () => {
    try {
      await callFunction('disconnect');
      setConnection({ connected: false, username: null, connectedAt: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to disconnect';
      setError(message);
      throw err;
    }
  }, [callFunction]);

  // List routes from RWGPS
  const listRwgpsRoutes = useCallback(async (
    page = 1,
    pageSize = 50
  ): Promise<RwgpsRoutesResponse> => {
    const data = await callFunction('list-routes', {
      page: page.toString(),
      page_size: pageSize.toString(),
    });
    return data;
  }, [callFunction]);

  // Get single route from RWGPS
  const getRwgpsRoute = useCallback(async (routeId: number) => {
    const data = await callFunction('get-route', { route_id: routeId.toString() });
    return data.route;
  }, [callFunction]);

  // Export route as GPX from RWGPS
  const exportRwgpsGpx = useCallback(async (routeId: number): Promise<string> => {
    const data = await callFunction('export-gpx', { route_id: routeId.toString() });
    return data.gpx;
  }, [callFunction]);

  // Create route on RWGPS from GPX
  const createRwgpsRoute = useCallback(async (
    gpx: string,
    name?: string,
    description?: string,
    visibility = 0 // private by default
  ) => {
    const data = await callFunction('create-route', {}, {
      gpx,
      name,
      description,
      visibility,
    });
    return data.route;
  }, [callFunction]);

  // Import a route from RWGPS to local database
  const importRoute = useCallback(async (
    rwgpsRouteId: number,
    createRoute: (route: {
      name: string;
      description?: string;
      distanceM: number;
      elevationGainM?: number;
      gpxData: string;
      waypoints: Array<{ lat: number; lng: number; name?: string }>;
    }) => Promise<Route | null>
  ): Promise<Route | null> => {
    try {
      // Get route details from RWGPS
      const rwgpsRoute = await getRwgpsRoute(rwgpsRouteId);

      // Get GPX data
      const gpxData = await exportRwgpsGpx(rwgpsRouteId);

      // Extract waypoints from GPX (basic parsing)
      const waypoints: Array<{ lat: number; lng: number; name?: string }> = [];

      // Parse start/end points from route data
      if (rwgpsRoute.first_lat && rwgpsRoute.first_lng) {
        waypoints.push({
          lat: rwgpsRoute.first_lat,
          lng: rwgpsRoute.first_lng,
          name: 'Start',
        });
      }
      if (rwgpsRoute.last_lat && rwgpsRoute.last_lng) {
        waypoints.push({
          lat: rwgpsRoute.last_lat,
          lng: rwgpsRoute.last_lng,
          name: 'End',
        });
      }

      // Create the route locally
      const newRoute = await createRoute({
        name: rwgpsRoute.name,
        description: rwgpsRoute.description || undefined,
        distanceM: rwgpsRoute.distance,
        elevationGainM: rwgpsRoute.elevation_gain,
        gpxData,
        waypoints,
      });

      if (newRoute) {
        // Update with RWGPS link info
        await supabase
          .from('routes')
          .update({
            rwgps_id: rwgpsRouteId,
            rwgps_synced_at: new Date().toISOString(),
            rwgps_sync_direction: 'pull',
          })
          .eq('id', newRoute.id);
      }

      return newRoute;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to import route';
      setError(message);
      return null;
    }
  }, [getRwgpsRoute, exportRwgpsGpx]);

  // Push a local route to RWGPS
  const pushRoute = useCallback(async (route: Route): Promise<number | null> => {
    try {
      const rwgpsRoute = await createRwgpsRoute(
        route.gpxData,
        route.name,
        route.description,
        0 // private
      );

      if (rwgpsRoute?.id) {
        // Update local route with RWGPS link
        await supabase
          .from('routes')
          .update({
            rwgps_id: rwgpsRoute.id,
            rwgps_synced_at: new Date().toISOString(),
            rwgps_sync_direction: 'push',
          })
          .eq('id', route.id);

        return rwgpsRoute.id;
      }

      return null;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to push route';
      setError(message);
      return null;
    }
  }, [createRwgpsRoute]);

  // List collections from RWGPS
  const listRwgpsCollections = useCallback(async (
    page = 1,
    pageSize = 50
  ): Promise<RwgpsCollectionsResponse> => {
    const data = await callFunction('list-collections', {
      page: page.toString(),
      page_size: pageSize.toString(),
    });
    return data;
  }, [callFunction]);

  // Get single collection from RWGPS
  const getRwgpsCollection = useCallback(async (collectionId: number) => {
    const data = await callFunction('get-collection', {
      collection_id: collectionId.toString(),
    });
    return data.collection;
  }, [callFunction]);

  // Get sync status for a route
  const getSyncStatus = useCallback((route: Route): RwgpsSyncStatus => {
    return {
      isLinked: !!route.rwgpsId,
      rwgpsId: route.rwgpsId || null,
      lastSyncedAt: route.rwgpsSyncedAt || null,
      syncDirection: route.rwgpsSyncDirection || null,
    };
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // Connection state
    connection,
    loading,
    error,

    // Auth
    connect,
    disconnect,
    handleOAuthCallback,

    // Routes
    listRwgpsRoutes,
    getRwgpsRoute,
    exportRwgpsGpx,
    createRwgpsRoute,
    importRoute,
    pushRoute,

    // Collections
    listRwgpsCollections,
    getRwgpsCollection,

    // Utilities
    getSyncStatus,
    clearError,
    refetch: fetchConnection,
  };
}
