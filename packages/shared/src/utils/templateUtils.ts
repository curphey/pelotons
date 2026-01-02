/**
 * Template Utilities
 *
 * Functions for adapting screen templates to different grid sizes.
 */

import type { Widget } from '../types/layout';
import type { ScreenTemplate, TemplateWidget } from '../constants/screenTemplates';

export interface AdaptedTemplate {
  /** Widgets adjusted for target grid, with unique IDs */
  widgets: Widget[];
  /** Warnings about widgets that were removed or modified */
  warnings: string[];
  /** Whether all widgets fit in the target grid */
  allWidgetsFit: boolean;
}

/**
 * Widget definitions for generating warning messages
 * Maps widget type to display label
 */
const WIDGET_LABELS: Record<string, string> = {
  speed: 'Speed',
  speed_avg: 'Avg Speed',
  speed_max: 'Max Speed',
  power_3s: '3s Power',
  power_avg: 'Avg Power',
  power_normalized: 'NP',
  power_lap: 'Lap Power',
  power_zone: 'Power Zone',
  power_if: 'IF',
  power_ftp_percent: 'FTP %',
  power_per_kg: 'W/kg',
  heart_rate: 'Heart Rate',
  heart_rate_avg: 'Avg HR',
  heart_rate_zone: 'HR Zone',
  heart_rate_lap: 'Lap HR',
  cadence: 'Cadence',
  distance: 'Distance',
  distance_remaining: 'Dist Remaining',
  time_elapsed: 'Elapsed Time',
  time_moving: 'Moving Time',
  time_lap: 'Lap Time',
  time_of_day: 'Time of Day',
  time_eta: 'ETA',
  elevation: 'Elevation',
  elevation_gain: 'Elevation Gain',
  elevation_loss: 'Elevation Loss',
  elevation_remaining: 'Elev Remaining',
  grade: 'Grade',
  vam: 'VAM',
  tss: 'TSS',
  kilojoules: 'Kilojoules',
  calories: 'Calories',
  laps: 'Laps',
  gear: 'Gear',
  battery_level: 'Battery',
  map_mini: 'Mini Map',
  turn_distance: 'Turn Distance',
  turn_direction: 'Turn Direction',
};

/**
 * Generate a unique ID for a widget
 */
function generateWidgetId(): string {
  return `w_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get display label for a widget type
 */
function getWidgetLabel(type: string): string {
  return WIDGET_LABELS[type] || type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Adapt a screen template to a target grid size.
 *
 * This function takes a template designed for a reference grid (typically 3x4)
 * and adapts it to a different target grid size. Widgets that don't fit in the
 * target grid are removed and noted in the warnings.
 *
 * @param template - The screen template to adapt
 * @param targetColumns - Number of columns in the target grid
 * @param targetRows - Number of rows in the target grid
 * @returns Adapted widgets and any warnings
 */
export function adaptTemplateToGrid(
  template: ScreenTemplate,
  targetColumns: number,
  targetRows: number
): AdaptedTemplate {
  const warnings: string[] = [];
  const adaptedWidgets: Widget[] = [];

  for (const widget of template.widgets) {
    // Check if widget fits within target grid bounds
    const widgetRight = widget.x + widget.width;
    const widgetBottom = widget.y + widget.height;

    if (widgetRight > targetColumns || widgetBottom > targetRows) {
      // Widget doesn't fit - add warning
      const label = getWidgetLabel(widget.type);

      if (widget.x >= targetColumns || widget.y >= targetRows) {
        // Widget is completely outside the grid
        warnings.push(`${label} removed (outside grid bounds)`);
      } else {
        // Widget partially fits - could resize but for simplicity we remove it
        warnings.push(`${label} removed (doesn't fit in ${targetColumns}x${targetRows} grid)`);
      }
      continue;
    }

    // Widget fits - add it with a unique ID
    adaptedWidgets.push({
      id: generateWidgetId(),
      type: widget.type,
      x: widget.x,
      y: widget.y,
      width: widget.width,
      height: widget.height,
    });
  }

  return {
    widgets: adaptedWidgets,
    warnings,
    allWidgetsFit: warnings.length === 0,
  };
}

/**
 * Convert template widgets to Widget array with unique IDs.
 * Use this when the grid sizes match and no adaptation is needed.
 *
 * @param widgets - Array of template widgets
 * @returns Array of widgets with unique IDs
 */
export function templateWidgetsToWidgets(widgets: TemplateWidget[]): Widget[] {
  return widgets.map(w => ({
    id: generateWidgetId(),
    type: w.type,
    x: w.x,
    y: w.y,
    width: w.width,
    height: w.height,
  }));
}

/**
 * Check if a template will fit perfectly in a target grid
 *
 * @param template - The screen template to check
 * @param targetColumns - Number of columns in the target grid
 * @param targetRows - Number of rows in the target grid
 * @returns true if all widgets will fit
 */
export function templateFitsGrid(
  template: ScreenTemplate,
  targetColumns: number,
  targetRows: number
): boolean {
  for (const widget of template.widgets) {
    const widgetRight = widget.x + widget.width;
    const widgetBottom = widget.y + widget.height;

    if (widgetRight > targetColumns || widgetBottom > targetRows) {
      return false;
    }
  }
  return true;
}

/**
 * Count how many widgets from a template will fit in a target grid
 *
 * @param template - The screen template to check
 * @param targetColumns - Number of columns in the target grid
 * @param targetRows - Number of rows in the target grid
 * @returns Object with counts
 */
export function countFittingWidgets(
  template: ScreenTemplate,
  targetColumns: number,
  targetRows: number
): { fitting: number; total: number; removed: number } {
  let fitting = 0;

  for (const widget of template.widgets) {
    const widgetRight = widget.x + widget.width;
    const widgetBottom = widget.y + widget.height;

    if (widgetRight <= targetColumns && widgetBottom <= targetRows) {
      fitting++;
    }
  }

  return {
    fitting,
    total: template.widgets.length,
    removed: template.widgets.length - fitting,
  };
}
