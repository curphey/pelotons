// RideWithGPS Integration Types

export interface RwgpsConnection {
  id: string;
  userId: string;
  rwgpsUserId: number;
  rwgpsUsername: string | null;
  connectedAt: string;
  updatedAt: string;
}

export interface RwgpsRoute {
  id: number;
  name: string;
  description: string | null;
  distance: number; // meters
  elevationGain: number; // meters
  elevationLoss: number; // meters
  trackType: 'route' | 'trip';
  visibility: 0 | 1 | 2; // 0=private, 1=friends, 2=public
  createdAt: string;
  updatedAt: string;
  userId: number;
  firstLat: number | null;
  firstLng: number | null;
  lastLat: number | null;
  lastLng: number | null;
}

export interface RwgpsCollection {
  id: number;
  name: string;
  description: string | null;
  routeCount: number;
  userId: number;
  createdAt: string;
  updatedAt: string;
}

export interface RwgpsUser {
  id: number;
  name: string;
  email: string;
  accountLevel: number;
}

export type RwgpsSyncDirection = 'push' | 'pull' | 'both';

export interface RwgpsSyncStatus {
  isLinked: boolean;
  rwgpsId: number | null;
  lastSyncedAt: string | null;
  syncDirection: RwgpsSyncDirection | null;
}

// API response types
export interface RwgpsRoutesResponse {
  results: RwgpsRoute[];
  results_count: number;
  page_count: number;
  page_size: number;
  next_page_url: string | null;
}

export interface RwgpsCollectionsResponse {
  results: RwgpsCollection[];
  results_count: number;
  page_count: number;
  page_size: number;
  next_page_url: string | null;
}
