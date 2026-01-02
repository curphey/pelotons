import { Route } from './route';

export interface RouteCollection {
  id: string;
  userId: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  // RideWithGPS sync fields
  rwgpsId?: number;
  rwgpsSyncedAt?: string;
}

export interface RouteCollectionInsert {
  name: string;
  description?: string;
}

export interface RouteCollectionUpdate {
  name?: string;
  description?: string;
}

export interface CollectionRoute {
  id: string;
  collectionId: string;
  routeId: string;
  position: number;
  addedAt: string;
}

// Extended collection with computed stats
export interface RouteCollectionWithStats extends RouteCollection {
  routeCount: number;
  totalDistanceM: number;
  totalElevationGainM: number;
}

// Collection with full route data for detail page
export interface RouteCollectionWithRoutes extends RouteCollection {
  routes: Route[];
}
