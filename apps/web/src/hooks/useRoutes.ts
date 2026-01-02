import { useState, useEffect, useCallback } from 'react';
import {
  supabase,
  DbRoute,
  parseWaypoints,
  parseCoordinates,
} from '@/lib/supabase';
import { Route, RouteInsert } from '@peloton/shared';
import { useAuth } from '@/components/Auth/AuthProvider';

// =============================================================================
// DATABASE TRANSFORMATION
// =============================================================================

/**
 * Transform database row to domain model
 * Uses type guards to safely parse JSON fields
 */
function dbToRoute(db: DbRoute): Route {
  return {
    id: db.id,
    userId: db.user_id,
    name: db.name,
    description: db.description ?? undefined,
    distanceM: db.distance_m,
    elevationGainM: db.elevation_gain_m ?? undefined,
    gpxData: db.gpx_data,
    waypoints: parseWaypoints(db.waypoints),
    routeCoordinates: parseCoordinates(db.route_coordinates) ?? undefined,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
    // RideWithGPS sync fields
    rwgpsId: db.rwgps_id ?? undefined,
    rwgpsSyncedAt: db.rwgps_synced_at ?? undefined,
    rwgpsSyncDirection: db.rwgps_sync_direction ?? undefined,
  };
}

// =============================================================================
// HOOK
// =============================================================================

export function useRoutes() {
  const { user } = useAuth();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch all routes for the current user
   */
  const fetchRoutes = useCallback(async () => {
    if (!user) {
      setRoutes([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('routes')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      setRoutes((data as DbRoute[]).map(dbToRoute));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch routes';
      console.error('useRoutes.fetchRoutes:', message);
      setError(message);
      setRoutes([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchRoutes();
  }, [fetchRoutes]);

  /**
   * Create a new route
   * Falls back to schema without route_coordinates if column doesn't exist
   */
  const createRoute = async (route: RouteInsert): Promise<Route | null> => {
    if (!user) {
      setError('You must be logged in to create a route');
      return null;
    }

    const baseData = {
      user_id: user.id,
      name: route.name,
      description: route.description,
      distance_m: route.distanceM,
      elevation_gain_m: route.elevationGainM,
      gpx_data: route.gpxData,
      waypoints: route.waypoints,
    };

    // Try with route_coordinates first (requires migration 002)
    const insertData: Record<string, unknown> = { ...baseData };
    if (route.routeCoordinates) {
      insertData.route_coordinates = route.routeCoordinates;
    }

    try {
      let { data, error: insertError } = await supabase
        .from('routes')
        .insert(insertData)
        .select()
        .single();

      // If failed due to missing column, retry without route_coordinates
      if (insertError?.message?.includes('route_coordinates')) {
        console.warn(
          '[useRoutes] route_coordinates column not found. Run migration 002 for realistic thumbnails.'
        );
        const { data: retryData, error: retryError } = await supabase
          .from('routes')
          .insert(baseData)
          .select()
          .single();
        data = retryData;
        insertError = retryError;
      }

      if (insertError) {
        throw new Error(insertError.message);
      }

      const newRoute = dbToRoute(data as DbRoute);
      setRoutes((prev) => [newRoute, ...prev]);
      return newRoute;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create route';
      console.error('useRoutes.createRoute:', message);
      setError(message);
      return null;
    }
  };

  /**
   * Update an existing route
   */
  const updateRoute = async (
    id: string,
    updates: Partial<RouteInsert>
  ): Promise<Route | null> => {
    if (!user) {
      setError('You must be logged in to update a route');
      return null;
    }

    const baseData: Record<string, unknown> = {};
    if (updates.name !== undefined) baseData.name = updates.name;
    if (updates.description !== undefined) baseData.description = updates.description;
    if (updates.distanceM !== undefined) baseData.distance_m = updates.distanceM;
    if (updates.elevationGainM !== undefined) baseData.elevation_gain_m = updates.elevationGainM;
    if (updates.gpxData !== undefined) baseData.gpx_data = updates.gpxData;
    if (updates.waypoints !== undefined) baseData.waypoints = updates.waypoints;

    const updateData = { ...baseData };
    if (updates.routeCoordinates !== undefined) {
      updateData.route_coordinates = updates.routeCoordinates;
    }

    try {
      let { data, error: updateError } = await supabase
        .from('routes')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      // If failed due to missing column, retry without route_coordinates
      if (updateError?.message?.includes('route_coordinates')) {
        console.warn('[useRoutes] route_coordinates column not found, updating without it.');
        const { data: retryData, error: retryError } = await supabase
          .from('routes')
          .update(baseData)
          .eq('id', id)
          .select()
          .single();
        data = retryData;
        updateError = retryError;
      }

      if (updateError) {
        throw new Error(updateError.message);
      }

      const updatedRoute = dbToRoute(data as DbRoute);
      setRoutes((prev) => prev.map((r) => (r.id === id ? updatedRoute : r)));
      return updatedRoute;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update route';
      console.error('useRoutes.updateRoute:', message);
      setError(message);
      return null;
    }
  };

  /**
   * Delete a route
   */
  const deleteRoute = async (id: string): Promise<boolean> => {
    if (!user) {
      setError('You must be logged in to delete a route');
      return false;
    }

    try {
      const { error: deleteError } = await supabase.from('routes').delete().eq('id', id);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      setRoutes((prev) => prev.filter((r) => r.id !== id));
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete route';
      console.error('useRoutes.deleteRoute:', message);
      setError(message);
      return false;
    }
  };

  /**
   * Clear any error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    routes,
    loading,
    error,
    createRoute,
    updateRoute,
    deleteRoute,
    refetch: fetchRoutes,
    clearError,
  };
}
