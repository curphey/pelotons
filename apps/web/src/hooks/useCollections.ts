import { useState, useEffect, useCallback } from 'react';
import { supabase, DbRouteCollection, DbRoute } from '@/lib/supabase';
import {
  RouteCollection,
  RouteCollectionInsert,
  RouteCollectionWithStats,
  RouteCollectionWithRoutes,
  Route,
  Waypoint,
} from '@peloton/shared';
import { useAuth } from '@/components/Auth/AuthProvider';

function dbToCollection(db: DbRouteCollection): RouteCollection {
  return {
    id: db.id,
    userId: db.user_id,
    name: db.name,
    description: db.description ?? undefined,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
    // RideWithGPS sync fields
    rwgpsId: db.rwgps_id ?? undefined,
    rwgpsSyncedAt: db.rwgps_synced_at ?? undefined,
  };
}

function dbToRoute(db: DbRoute): Route {
  return {
    id: db.id,
    userId: db.user_id,
    name: db.name,
    description: db.description ?? undefined,
    distanceM: db.distance_m,
    elevationGainM: db.elevation_gain_m ?? undefined,
    gpxData: db.gpx_data,
    waypoints: db.waypoints as Waypoint[],
    routeCoordinates: db.route_coordinates as [number, number][] | undefined,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
    // RideWithGPS sync fields
    rwgpsId: db.rwgps_id ?? undefined,
    rwgpsSyncedAt: db.rwgps_synced_at ?? undefined,
    rwgpsSyncDirection: db.rwgps_sync_direction ?? undefined,
  };
}

export function useCollections() {
  const { user } = useAuth();
  const [collections, setCollections] = useState<RouteCollectionWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCollections = useCallback(async () => {
    if (!user) {
      setCollections([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Fetch collections
    const { data: collectionsData, error: collectionsError } = await supabase
      .from('route_collections')
      .select('*')
      .order('created_at', { ascending: false });

    if (collectionsError) {
      setError(collectionsError.message);
      setCollections([]);
      setLoading(false);
      return;
    }

    // For each collection, get stats
    const collectionsWithStats: RouteCollectionWithStats[] = await Promise.all(
      (collectionsData as DbRouteCollection[]).map(async (collection) => {
        // Get routes in this collection with their data
        const { data: routeLinks } = await supabase
          .from('collection_routes')
          .select('route_id')
          .eq('collection_id', collection.id);

        let totalDistanceM = 0;
        let totalElevationGainM = 0;
        const routeCount = routeLinks?.length || 0;

        if (routeLinks && routeLinks.length > 0) {
          const routeIds = routeLinks.map((link) => link.route_id);
          const { data: routesData } = await supabase
            .from('routes')
            .select('distance_m, elevation_gain_m')
            .in('id', routeIds);

          if (routesData) {
            routesData.forEach((route) => {
              totalDistanceM += route.distance_m || 0;
              totalElevationGainM += route.elevation_gain_m || 0;
            });
          }
        }

        return {
          ...dbToCollection(collection),
          routeCount,
          totalDistanceM,
          totalElevationGainM,
        };
      })
    );

    setCollections(collectionsWithStats);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  const createCollection = async (
    data: RouteCollectionInsert
  ): Promise<RouteCollection | null> => {
    if (!user) return null;

    const { data: newCollection, error: createError } = await supabase
      .from('route_collections')
      .insert({
        user_id: user.id,
        name: data.name,
        description: data.description,
      })
      .select()
      .single();

    if (createError) {
      console.error('Failed to create collection:', createError);
      setError(createError.message);
      return null;
    }

    const collection = dbToCollection(newCollection as DbRouteCollection);
    const collectionWithStats: RouteCollectionWithStats = {
      ...collection,
      routeCount: 0,
      totalDistanceM: 0,
      totalElevationGainM: 0,
    };
    setCollections((prev) => [collectionWithStats, ...prev]);
    return collection;
  };

  const updateCollection = async (
    id: string,
    updates: Partial<RouteCollectionInsert>
  ): Promise<RouteCollection | null> => {
    const updateData: Record<string, unknown> = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;

    const { data, error: updateError } = await supabase
      .from('route_collections')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to update collection:', updateError);
      setError(updateError.message);
      return null;
    }

    const updated = dbToCollection(data as DbRouteCollection);
    setCollections((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, name: updated.name, description: updated.description } : c
      )
    );
    return updated;
  };

  const deleteCollection = async (id: string): Promise<boolean> => {
    const { error: deleteError } = await supabase
      .from('route_collections')
      .delete()
      .eq('id', id);

    if (deleteError) {
      setError(deleteError.message);
      return false;
    }

    setCollections((prev) => prev.filter((c) => c.id !== id));
    return true;
  };

  const addRouteToCollection = async (
    collectionId: string,
    routeId: string
  ): Promise<boolean> => {
    // Get current max position
    const { data: existingRoutes } = await supabase
      .from('collection_routes')
      .select('position')
      .eq('collection_id', collectionId)
      .order('position', { ascending: false })
      .limit(1);

    const nextPosition = existingRoutes && existingRoutes.length > 0
      ? existingRoutes[0].position + 1
      : 0;

    const { error: insertError } = await supabase
      .from('collection_routes')
      .insert({
        collection_id: collectionId,
        route_id: routeId,
        position: nextPosition,
      });

    if (insertError) {
      // Handle duplicate (route already in collection)
      if (insertError.code === '23505') {
        return true; // Already exists, not an error
      }
      console.error('Failed to add route to collection:', insertError);
      setError(insertError.message);
      return false;
    }

    // Refresh collections to update stats
    fetchCollections();
    return true;
  };

  const removeRouteFromCollection = async (
    collectionId: string,
    routeId: string
  ): Promise<boolean> => {
    const { error: deleteError } = await supabase
      .from('collection_routes')
      .delete()
      .eq('collection_id', collectionId)
      .eq('route_id', routeId);

    if (deleteError) {
      setError(deleteError.message);
      return false;
    }

    // Refresh collections to update stats
    fetchCollections();
    return true;
  };

  const reorderRoutes = async (
    collectionId: string,
    routeIds: string[]
  ): Promise<boolean> => {
    // Update positions for all routes in the new order
    const updates = routeIds.map((routeId, index) =>
      supabase
        .from('collection_routes')
        .update({ position: index })
        .eq('collection_id', collectionId)
        .eq('route_id', routeId)
    );

    const results = await Promise.all(updates);
    const hasError = results.some((r) => r.error);

    if (hasError) {
      setError('Failed to reorder routes');
      return false;
    }

    return true;
  };

  const getCollectionWithRoutes = useCallback(async (
    id: string
  ): Promise<RouteCollectionWithRoutes | null> => {
    // Fetch collection
    const { data: collectionData, error: collectionError } = await supabase
      .from('route_collections')
      .select('*')
      .eq('id', id)
      .single();

    if (collectionError) {
      setError(collectionError.message);
      return null;
    }

    // Fetch routes in collection, ordered by position
    const { data: routeLinks, error: linksError } = await supabase
      .from('collection_routes')
      .select('route_id, position')
      .eq('collection_id', id)
      .order('position', { ascending: true });

    if (linksError) {
      setError(linksError.message);
      return null;
    }

    let routes: Route[] = [];
    if (routeLinks && routeLinks.length > 0) {
      const routeIds = routeLinks.map((link) => link.route_id);
      const { data: routesData, error: routesError } = await supabase
        .from('routes')
        .select('*')
        .in('id', routeIds);

      if (routesError) {
        setError(routesError.message);
        return null;
      }

      // Sort routes by their position in the collection
      const routeIdOrder = routeLinks.map((link) => link.route_id);
      routes = (routesData as DbRoute[])
        .map(dbToRoute)
        .sort((a, b) => routeIdOrder.indexOf(a.id) - routeIdOrder.indexOf(b.id));
    }

    return {
      ...dbToCollection(collectionData as DbRouteCollection),
      routes,
    };
  }, []);

  const getCollectionsForRoute = useCallback(async (routeId: string): Promise<RouteCollection[]> => {
    const { data: links, error: linksError } = await supabase
      .from('collection_routes')
      .select('collection_id')
      .eq('route_id', routeId);

    if (linksError || !links || links.length === 0) {
      return [];
    }

    const collectionIds = links.map((link) => link.collection_id);
    const { data: collectionsData, error: collectionsError } = await supabase
      .from('route_collections')
      .select('*')
      .in('id', collectionIds);

    if (collectionsError) {
      return [];
    }

    return (collectionsData as DbRouteCollection[]).map(dbToCollection);
  }, []);

  return {
    collections,
    loading,
    error,
    createCollection,
    updateCollection,
    deleteCollection,
    addRouteToCollection,
    removeRouteFromCollection,
    reorderRoutes,
    getCollectionWithRoutes,
    getCollectionsForRoute,
    refetch: fetchCollections,
  };
}
