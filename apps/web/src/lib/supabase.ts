import { createClient } from '@supabase/supabase-js';
import type { Widget, LayoutMode, SlotAssignment } from '@peloton/shared';

// =============================================================================
// ENVIRONMENT VALIDATION
// =============================================================================

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabasePublishableKey = import.meta.env.SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY in your .env file.'
  );
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey);

// =============================================================================
// SHARED TYPES
// =============================================================================

/** GPS coordinate as [longitude, latitude] tuple (GeoJSON order) */
export type Coordinate = [number, number];

/** Route waypoint with optional metadata */
export interface Waypoint {
  lat: number;
  lng: number;
  name?: string;
  type?: 'start' | 'end' | 'via' | 'poi';
  elevation?: number;
}

// =============================================================================
// DATABASE TYPES - Match Supabase schema exactly (snake_case)
// =============================================================================

/**
 * Layout table - Screen widget configurations
 * Created in the web Layout Builder
 */
export interface DbLayout {
  id: string;
  user_id: string;
  name: string;
  screen_type: 'map' | 'data';
  widgets: Widget[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Routes table - GPX routes created in web app
 */
export interface DbRoute {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  distance_m: number;
  elevation_gain_m: number | null;
  gpx_data: string;
  waypoints: Waypoint[];
  route_coordinates: Coordinate[] | null;
  created_at: string;
  updated_at: string;
  // RideWithGPS sync fields
  rwgps_id: number | null;
  rwgps_synced_at: string | null;
  rwgps_sync_direction: 'push' | 'pull' | 'both' | null;
}

/**
 * Rides table - Recorded cycling activities
 */
export interface DbRide {
  id: string;
  user_id: string;
  route_id: string | null;
  name: string | null;
  started_at: string;
  ended_at: string | null;
  distance_m: number;
  elapsed_time_s: number;
  moving_time_s: number;
  avg_speed_ms: number | null;
  max_speed_ms: number | null;
  avg_power: number | null;
  max_power: number | null;
  avg_hr: number | null;
  max_hr: number | null;
  elevation_gain_m: number | null;
  gpx_path: string | null;
  created_at: string;
}

/**
 * Sensors table - Paired Bluetooth sensors
 */
export interface DbSensor {
  id: string;
  user_id: string;
  name: string;
  sensor_type: 'heart_rate' | 'power' | 'cadence' | 'speed' | 'sram_axs';
  ble_id: string;
  ble_name: string | null;
  last_connected_at: string | null;
  created_at: string;
}

/**
 * Route collections table - User-created route groupings
 */
export interface DbRouteCollection {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  // RideWithGPS sync fields
  rwgps_id: number | null;
  rwgps_synced_at: string | null;
}

/**
 * RideWithGPS OAuth connections table
 */
export interface DbRwgpsConnection {
  id: string;
  user_id: string;
  rwgps_user_id: number;
  rwgps_username: string | null;
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string | null;
  connected_at: string;
  updated_at: string;
}

/**
 * Collection routes junction table - Links routes to collections
 */
export interface DbCollectionRoute {
  id: string;
  collection_id: string;
  route_id: string;
  position: number;
  added_at: string;
}

/**
 * Data profiles table - Screen configuration profiles
 */
export interface DbDataProfile {
  id: string;
  user_id: string;
  name: string;
  device_type: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Profile screens table - Individual screens within a profile
 */
export interface DbProfileScreen {
  id: string;
  profile_id: string;
  name: string;
  screen_type: 'data' | 'map';
  position: number;
  grid_columns: number;
  grid_rows: number;
  widgets: Widget[];
  // Priority layout mode fields
  layout_mode: LayoutMode | null;
  layout_preset_id: string | null;
  slot_assignments: SlotAssignment[] | null;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// TYPE GUARDS - Runtime validation helpers
// =============================================================================

/**
 * Type guard to validate Widget array from database
 */
export function isWidgetArray(value: unknown): value is Widget[] {
  if (!Array.isArray(value)) return false;
  return value.every(
    (item) =>
      typeof item === 'object' &&
      item !== null &&
      'id' in item &&
      'type' in item &&
      'x' in item &&
      'y' in item &&
      'width' in item &&
      'height' in item
  );
}

/**
 * Type guard to validate Waypoint array from database
 */
export function isWaypointArray(value: unknown): value is Waypoint[] {
  if (!Array.isArray(value)) return false;
  return value.every(
    (item) =>
      typeof item === 'object' &&
      item !== null &&
      'lat' in item &&
      'lng' in item &&
      typeof (item as Waypoint).lat === 'number' &&
      typeof (item as Waypoint).lng === 'number'
  );
}

/**
 * Type guard to validate Coordinate array from database
 */
export function isCoordinateArray(value: unknown): value is Coordinate[] {
  if (!Array.isArray(value)) return false;
  return value.every(
    (item) =>
      Array.isArray(item) &&
      item.length === 2 &&
      typeof item[0] === 'number' &&
      typeof item[1] === 'number'
  );
}

/**
 * Safely parse widgets from database JSON
 */
export function parseWidgets(value: unknown): Widget[] {
  if (isWidgetArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (isWidgetArray(parsed)) return parsed;
    } catch {
      // Invalid JSON, return empty array
    }
  }
  return [];
}

/**
 * Safely parse waypoints from database JSON
 */
export function parseWaypoints(value: unknown): Waypoint[] {
  if (isWaypointArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (isWaypointArray(parsed)) return parsed;
    } catch {
      // Invalid JSON, return empty array
    }
  }
  return [];
}

/**
 * Safely parse coordinates from database JSON
 */
export function parseCoordinates(value: unknown): Coordinate[] | null {
  if (isCoordinateArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (isCoordinateArray(parsed)) return parsed;
    } catch {
      // Invalid JSON, return null
    }
  }
  return null;
}
