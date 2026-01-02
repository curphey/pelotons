/**
 * Screen Templates for Layout Builder
 *
 * Pre-configured screen layouts that users can select and customize.
 * Templates are organized by category for easy browsing.
 */

import type { WidgetType } from '../types/layout';

// =============================================================================
// TYPES
// =============================================================================

export type TemplateCategory =
  | 'racing'
  | 'climbing'
  | 'training'
  | 'endurance'
  | 'navigation'
  | 'minimal';

export interface TemplateWidget {
  type: WidgetType;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ScreenTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  icon: string;
  referenceGrid: {
    columns: number;
    rows: number;
  };
  widgets: TemplateWidget[];
  tags: string[];
}

export interface TemplateCategoryDefinition {
  id: TemplateCategory;
  label: string;
  description: string;
  icon: string;
  color: string;
}

// =============================================================================
// TEMPLATE CATEGORIES
// =============================================================================

export const TEMPLATE_CATEGORIES: TemplateCategoryDefinition[] = [
  {
    id: 'racing',
    label: 'Racing',
    description: 'Power-focused layouts for competitive cycling',
    icon: 'trophy',
    color: '#ef4444', // red
  },
  {
    id: 'climbing',
    label: 'Climbing',
    description: 'Elevation and VAM metrics for hill climbs',
    icon: 'mountain',
    color: '#f59e0b', // amber
  },
  {
    id: 'training',
    label: 'Training',
    description: 'Interval and structured workout layouts',
    icon: 'target',
    color: '#8b5cf6', // violet
  },
  {
    id: 'endurance',
    label: 'Endurance',
    description: 'Long ride essentials and adventure metrics',
    icon: 'route',
    color: '#22c55e', // green
  },
  {
    id: 'navigation',
    label: 'Navigation',
    description: 'Map-focused layouts for route following',
    icon: 'map',
    color: '#3b82f6', // blue
  },
  {
    id: 'minimal',
    label: 'Minimal',
    description: 'Clean, distraction-free essentials',
    icon: 'layout',
    color: '#6b7280', // gray
  },
];

// =============================================================================
// SCREEN TEMPLATES
// =============================================================================

export const SCREEN_TEMPLATES: ScreenTemplate[] = [
  // ---------------------------------------------------------------------------
  // RACING CATEGORY
  // ---------------------------------------------------------------------------
  {
    id: 'road_racing',
    name: 'Road Racing',
    description: 'Power-focused layout for competitive road cycling and racing',
    category: 'racing',
    icon: 'trophy',
    referenceGrid: { columns: 3, rows: 4 },
    widgets: [
      { type: 'power_3s', x: 0, y: 0, width: 1, height: 1 },
      { type: 'heart_rate', x: 1, y: 0, width: 1, height: 1 },
      { type: 'speed', x: 2, y: 0, width: 1, height: 1 },
      { type: 'power_normalized', x: 0, y: 1, width: 1, height: 1 },
      { type: 'time_elapsed', x: 1, y: 1, width: 1, height: 1 },
      { type: 'distance', x: 2, y: 1, width: 1, height: 1 },
      { type: 'cadence', x: 0, y: 2, width: 1, height: 1 },
      { type: 'power_if', x: 1, y: 2, width: 1, height: 1 },
      { type: 'tss', x: 2, y: 2, width: 1, height: 1 },
      { type: 'power_avg', x: 0, y: 3, width: 1, height: 1 },
      { type: 'speed_avg', x: 1, y: 3, width: 1, height: 1 },
      { type: 'time_of_day', x: 2, y: 3, width: 1, height: 1 },
    ],
    tags: ['power', 'racing', 'competition', 'criterium', 'road', 'performance'],
  },
  {
    id: 'indoor_training',
    name: 'Indoor Training',
    description: 'Optimized for smart trainer and indoor sessions',
    category: 'racing',
    icon: 'home',
    referenceGrid: { columns: 3, rows: 4 },
    widgets: [
      { type: 'power_3s', x: 0, y: 0, width: 1, height: 1 },
      { type: 'heart_rate', x: 1, y: 0, width: 1, height: 1 },
      { type: 'cadence', x: 2, y: 0, width: 1, height: 1 },
      { type: 'power_zone', x: 0, y: 1, width: 1, height: 1 },
      { type: 'time_elapsed', x: 1, y: 1, width: 1, height: 1 },
      { type: 'heart_rate_zone', x: 2, y: 1, width: 1, height: 1 },
      { type: 'power_avg', x: 0, y: 2, width: 1, height: 1 },
      { type: 'power_normalized', x: 1, y: 2, width: 1, height: 1 },
      { type: 'kilojoules', x: 2, y: 2, width: 1, height: 1 },
      { type: 'power_ftp_percent', x: 0, y: 3, width: 1, height: 1 },
      { type: 'tss', x: 1, y: 3, width: 1, height: 1 },
      { type: 'calories', x: 2, y: 3, width: 1, height: 1 },
    ],
    tags: ['indoor', 'trainer', 'zwift', 'power', 'zones'],
  },

  // ---------------------------------------------------------------------------
  // CLIMBING CATEGORY
  // ---------------------------------------------------------------------------
  {
    id: 'climbing',
    name: 'Climbing',
    description: 'Optimized for hill climbs with elevation and VAM metrics',
    category: 'climbing',
    icon: 'mountain',
    referenceGrid: { columns: 3, rows: 4 },
    widgets: [
      { type: 'grade', x: 0, y: 0, width: 1, height: 1 },
      { type: 'power_3s', x: 1, y: 0, width: 1, height: 1 },
      { type: 'heart_rate', x: 2, y: 0, width: 1, height: 1 },
      { type: 'vam', x: 0, y: 1, width: 1, height: 1 },
      { type: 'elevation_gain', x: 1, y: 1, width: 1, height: 1 },
      { type: 'elevation', x: 2, y: 1, width: 1, height: 1 },
      { type: 'speed', x: 0, y: 2, width: 1, height: 1 },
      { type: 'cadence', x: 1, y: 2, width: 1, height: 1 },
      { type: 'distance', x: 2, y: 2, width: 1, height: 1 },
      { type: 'power_per_kg', x: 0, y: 3, width: 1, height: 1 },
      { type: 'time_elapsed', x: 1, y: 3, width: 1, height: 1 },
      { type: 'elevation_remaining', x: 2, y: 3, width: 1, height: 1 },
    ],
    tags: ['climbing', 'hills', 'mountains', 'vam', 'elevation', 'gradient'],
  },
  {
    id: 'mtb',
    name: 'Mountain Bike',
    description: 'Trail riding with elevation and gear info',
    category: 'climbing',
    icon: 'bike',
    referenceGrid: { columns: 3, rows: 4 },
    widgets: [
      { type: 'speed', x: 0, y: 0, width: 1, height: 1 },
      { type: 'grade', x: 1, y: 0, width: 1, height: 1 },
      { type: 'heart_rate', x: 2, y: 0, width: 1, height: 1 },
      { type: 'elevation', x: 0, y: 1, width: 1, height: 1 },
      { type: 'elevation_gain', x: 1, y: 1, width: 1, height: 1 },
      { type: 'gear', x: 2, y: 1, width: 1, height: 1 },
      { type: 'distance', x: 0, y: 2, width: 1, height: 1 },
      { type: 'time_elapsed', x: 1, y: 2, width: 1, height: 1 },
      { type: 'cadence', x: 2, y: 2, width: 1, height: 1 },
      { type: 'speed_max', x: 0, y: 3, width: 1, height: 1 },
      { type: 'elevation_loss', x: 1, y: 3, width: 1, height: 1 },
      { type: 'time_of_day', x: 2, y: 3, width: 1, height: 1 },
    ],
    tags: ['mtb', 'mountain', 'trail', 'offroad', 'singletrack'],
  },

  // ---------------------------------------------------------------------------
  // TRAINING CATEGORY
  // ---------------------------------------------------------------------------
  {
    id: 'structured_training',
    name: 'Structured Training',
    description: 'For interval training with lap metrics and zone tracking',
    category: 'training',
    icon: 'target',
    referenceGrid: { columns: 3, rows: 4 },
    widgets: [
      { type: 'power_3s', x: 0, y: 0, width: 1, height: 1 },
      { type: 'power_zone', x: 1, y: 0, width: 1, height: 1 },
      { type: 'heart_rate_zone', x: 2, y: 0, width: 1, height: 1 },
      { type: 'time_lap', x: 0, y: 1, width: 1, height: 1 },
      { type: 'power_lap', x: 1, y: 1, width: 1, height: 1 },
      { type: 'heart_rate_lap', x: 2, y: 1, width: 1, height: 1 },
      { type: 'laps', x: 0, y: 2, width: 1, height: 1 },
      { type: 'cadence', x: 1, y: 2, width: 1, height: 1 },
      { type: 'tss', x: 2, y: 2, width: 1, height: 1 },
      { type: 'time_elapsed', x: 0, y: 3, width: 1, height: 1 },
      { type: 'power_avg', x: 1, y: 3, width: 1, height: 1 },
      { type: 'kilojoules', x: 2, y: 3, width: 1, height: 1 },
    ],
    tags: ['intervals', 'training', 'workout', 'laps', 'zones', 'structured'],
  },

  // ---------------------------------------------------------------------------
  // ENDURANCE CATEGORY
  // ---------------------------------------------------------------------------
  {
    id: 'endurance',
    name: 'Endurance',
    description: 'Essential metrics for long-distance rides',
    category: 'endurance',
    icon: 'clock',
    referenceGrid: { columns: 3, rows: 4 },
    widgets: [
      { type: 'speed', x: 0, y: 0, width: 1, height: 1 },
      { type: 'heart_rate', x: 1, y: 0, width: 1, height: 1 },
      { type: 'cadence', x: 2, y: 0, width: 1, height: 1 },
      { type: 'time_elapsed', x: 0, y: 1, width: 1, height: 1 },
      { type: 'distance', x: 1, y: 1, width: 1, height: 1 },
      { type: 'elevation_gain', x: 2, y: 1, width: 1, height: 1 },
      { type: 'speed_avg', x: 0, y: 2, width: 1, height: 1 },
      { type: 'heart_rate_avg', x: 1, y: 2, width: 1, height: 1 },
      { type: 'calories', x: 2, y: 2, width: 1, height: 1 },
      { type: 'time_of_day', x: 0, y: 3, width: 1, height: 1 },
      { type: 'time_moving', x: 1, y: 3, width: 1, height: 1 },
      { type: 'battery_level', x: 2, y: 3, width: 1, height: 1 },
    ],
    tags: ['endurance', 'long', 'distance', 'century', 'gran fondo'],
  },
  {
    id: 'gravel',
    name: 'Gravel Adventure',
    description: 'Balanced layout for gravel and adventure riding',
    category: 'endurance',
    icon: 'compass',
    referenceGrid: { columns: 3, rows: 4 },
    widgets: [
      { type: 'speed', x: 0, y: 0, width: 1, height: 1 },
      { type: 'heart_rate', x: 1, y: 0, width: 1, height: 1 },
      { type: 'distance_remaining', x: 2, y: 0, width: 1, height: 1 },
      { type: 'elevation_gain', x: 0, y: 1, width: 1, height: 1 },
      { type: 'grade', x: 1, y: 1, width: 1, height: 1 },
      { type: 'elevation_remaining', x: 2, y: 1, width: 1, height: 1 },
      { type: 'distance', x: 0, y: 2, width: 1, height: 1 },
      { type: 'time_elapsed', x: 1, y: 2, width: 1, height: 1 },
      { type: 'time_eta', x: 2, y: 2, width: 1, height: 1 },
      { type: 'cadence', x: 0, y: 3, width: 1, height: 1 },
      { type: 'calories', x: 1, y: 3, width: 1, height: 1 },
      { type: 'battery_level', x: 2, y: 3, width: 1, height: 1 },
    ],
    tags: ['gravel', 'adventure', 'bikepacking', 'exploration'],
  },

  // ---------------------------------------------------------------------------
  // NAVIGATION CATEGORY
  // ---------------------------------------------------------------------------
  {
    id: 'navigation',
    name: 'Navigation',
    description: 'Map-focused layout for route following',
    category: 'navigation',
    icon: 'map',
    referenceGrid: { columns: 3, rows: 4 },
    widgets: [
      { type: 'turn_distance', x: 0, y: 0, width: 1, height: 1 },
      { type: 'turn_direction', x: 1, y: 0, width: 1, height: 1 },
      { type: 'distance_remaining', x: 2, y: 0, width: 1, height: 1 },
      { type: 'map_mini', x: 0, y: 1, width: 2, height: 2 },
      { type: 'time_eta', x: 2, y: 1, width: 1, height: 1 },
      { type: 'elevation_remaining', x: 2, y: 2, width: 1, height: 1 },
      { type: 'speed', x: 0, y: 3, width: 1, height: 1 },
      { type: 'distance', x: 1, y: 3, width: 1, height: 1 },
      { type: 'time_of_day', x: 2, y: 3, width: 1, height: 1 },
    ],
    tags: ['navigation', 'route', 'directions', 'map', 'gps'],
  },
  {
    id: 'commute',
    name: 'Commute',
    description: 'Simple layout for daily commuting',
    category: 'navigation',
    icon: 'briefcase',
    referenceGrid: { columns: 3, rows: 4 },
    widgets: [
      { type: 'speed', x: 0, y: 0, width: 1, height: 1 },
      { type: 'time_of_day', x: 1, y: 0, width: 1, height: 1 },
      { type: 'time_eta', x: 2, y: 0, width: 1, height: 1 },
      { type: 'distance', x: 0, y: 1, width: 1, height: 1 },
      { type: 'time_elapsed', x: 1, y: 1, width: 1, height: 1 },
      { type: 'distance_remaining', x: 2, y: 1, width: 1, height: 1 },
      { type: 'map_mini', x: 0, y: 2, width: 2, height: 2 },
      { type: 'turn_distance', x: 2, y: 2, width: 1, height: 1 },
      { type: 'battery_level', x: 2, y: 3, width: 1, height: 1 },
    ],
    tags: ['commute', 'daily', 'work', 'simple'],
  },

  // ---------------------------------------------------------------------------
  // MINIMAL CATEGORY
  // ---------------------------------------------------------------------------
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Clean layout with essential metrics only',
    category: 'minimal',
    icon: 'layout',
    referenceGrid: { columns: 3, rows: 4 },
    widgets: [
      { type: 'speed', x: 0, y: 0, width: 1, height: 2 },
      { type: 'heart_rate', x: 1, y: 0, width: 1, height: 2 },
      { type: 'time_elapsed', x: 2, y: 0, width: 1, height: 1 },
      { type: 'distance', x: 2, y: 1, width: 1, height: 1 },
      { type: 'elevation_gain', x: 0, y: 2, width: 1, height: 1 },
      { type: 'cadence', x: 1, y: 2, width: 1, height: 1 },
      { type: 'time_of_day', x: 2, y: 2, width: 1, height: 1 },
    ],
    tags: ['minimal', 'clean', 'simple', 'basic', 'essentials'],
  },
  {
    id: 'big_numbers',
    name: 'Big Numbers',
    description: 'Large, easy-to-read metrics for at-a-glance viewing',
    category: 'minimal',
    icon: 'eye',
    referenceGrid: { columns: 3, rows: 4 },
    widgets: [
      { type: 'speed', x: 0, y: 0, width: 2, height: 2 },
      { type: 'heart_rate', x: 2, y: 0, width: 1, height: 2 },
      { type: 'distance', x: 0, y: 2, width: 2, height: 2 },
      { type: 'time_elapsed', x: 2, y: 2, width: 1, height: 2 },
    ],
    tags: ['big', 'large', 'readable', 'glance', 'easy'],
  },
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get templates filtered by category
 */
export function getTemplatesByCategory(category: TemplateCategory): ScreenTemplate[] {
  return SCREEN_TEMPLATES.filter(t => t.category === category);
}

/**
 * Search templates by query (matches name, description, and tags)
 */
export function searchTemplates(query: string): ScreenTemplate[] {
  const lowerQuery = query.toLowerCase();
  return SCREEN_TEMPLATES.filter(
    t =>
      t.name.toLowerCase().includes(lowerQuery) ||
      t.description.toLowerCase().includes(lowerQuery) ||
      t.tags.some(tag => tag.includes(lowerQuery))
  );
}

/**
 * Get a template by ID
 */
export function getTemplateById(id: string): ScreenTemplate | undefined {
  return SCREEN_TEMPLATES.find(t => t.id === id);
}
