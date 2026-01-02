/**
 * Interactive Phone Simulator
 *
 * A larger, interactive version of the phone simulator that serves as the
 * main editing interface. Supports widget selection, highlighting, and deletion.
 */

import { useEffect, useCallback } from 'react';
import {
  ProfileScreen,
  Widget,
  DEVICE_PRESETS,
  WIDGET_DEFINITIONS,
  LCD_COLORS,
} from '@peloton/shared';

interface InteractivePhoneSimulatorProps {
  deviceType: string;
  screen: ProfileScreen;
  selectedWidgetId: string | null;
  onWidgetSelect: (widgetId: string | null) => void;
  onWidgetMove: (widgetId: string, x: number, y: number) => void;
  onWidgetDelete: (widgetId: string) => void;
  scale?: number;
}

// Phone frame dimensions
const PHONE_FRAMES: Record<string, {
  frameWidth: number;
  frameHeight: number;
  screenInset: { top: number; bottom: number; left: number; right: number };
  cornerRadius: number;
  notchType: 'none' | 'notch' | 'dynamic_island';
  notchWidth?: number;
  notchHeight?: number;
  bezelColor: string;
  frameColor: string;
}> = {
  iphone_se: {
    frameWidth: 67,
    frameHeight: 138,
    screenInset: { top: 20, bottom: 20, left: 4, right: 4 },
    cornerRadius: 10,
    notchType: 'none',
    bezelColor: '#1a1a1a',
    frameColor: '#2d2d2d',
  },
  iphone_14: {
    frameWidth: 71,
    frameHeight: 146,
    screenInset: { top: 4, bottom: 4, left: 4, right: 4 },
    cornerRadius: 20,
    notchType: 'notch',
    notchWidth: 35,
    notchHeight: 7,
    bezelColor: '#1a1a1a',
    frameColor: '#2d2d2d',
  },
  iphone_15: {
    frameWidth: 71,
    frameHeight: 147,
    screenInset: { top: 4, bottom: 4, left: 4, right: 4 },
    cornerRadius: 22,
    notchType: 'dynamic_island',
    notchWidth: 25,
    notchHeight: 8,
    bezelColor: '#1a1a1a',
    frameColor: '#3d3d3d',
  },
  iphone_15_pro_max: {
    frameWidth: 77,
    frameHeight: 158,
    screenInset: { top: 4, bottom: 4, left: 4, right: 4 },
    cornerRadius: 24,
    notchType: 'dynamic_island',
    notchWidth: 28,
    notchHeight: 9,
    bezelColor: '#1a1a1a',
    frameColor: '#4a4a52',
  },
  iphone_16: {
    frameWidth: 71,
    frameHeight: 147,
    screenInset: { top: 4, bottom: 4, left: 4, right: 4 },
    cornerRadius: 22,
    notchType: 'dynamic_island',
    notchWidth: 25,
    notchHeight: 8,
    bezelColor: '#1a1a1a',
    frameColor: '#2d2d2d',
  },
  iphone_16_pro_max: {
    frameWidth: 78,
    frameHeight: 162,
    screenInset: { top: 4, bottom: 4, left: 4, right: 4 },
    cornerRadius: 24,
    notchType: 'dynamic_island',
    notchWidth: 28,
    notchHeight: 9,
    bezelColor: '#1a1a1a',
    frameColor: '#4a4a52',
  },
};

// Sample values for widget preview
const SAMPLE_VALUES: Record<string, string> = {
  speed: '28.5', speed_avg: '27.8', speed_max: '52.3', speed_lap: '29.1', speed_3s: '28.2',
  pace: '2:06', pace_avg: '2:09',
  power: '245', power_3s: '248', power_10s: '242', power_30s: '238', power_avg: '235',
  power_max: '892', power_lap: '251', power_normalized: '248', power_per_kg: '3.5',
  power_ftp_percent: '88', power_zone: 'Z3', power_if: '0.92', power_balance: '51/49',
  heart_rate: '142', heart_rate_avg: '138', heart_rate_max: '172', heart_rate_lap: '145',
  heart_rate_zone: 'Z3', heart_rate_percent_max: '78',
  cadence: '92', cadence_avg: '89', cadence_max: '112',
  distance: '42.5', distance_lap: '2.3', distance_remaining: '18.2', distance_to_destination: '12.5',
  time_elapsed: '1:23:45', time_lap: '4:32', time_last_lap: '4:28', time_moving: '1:21:30',
  time_of_day: '14:32', time_eta: '16:45', time_remaining: '0:42:00', laps: '8',
  elevation: '380', elevation_gain: '+1,240', elevation_loss: '-860', elevation_remaining: '+520',
  grade: '4.2', grade_avg: '3.8', vam: '892',
  heading: 'NE', turn_distance: '250', off_course: '0',
  calories: '847', kilojoules: '1,420', tss: '78',
  gear: '52x11', gear_combo: '52/11', gear_ratio: '4.73',
  temperature: '22', battery_level: '87', wind_speed: '12',
};

export function InteractivePhoneSimulator({
  deviceType,
  screen,
  selectedWidgetId,
  onWidgetSelect,
  onWidgetMove: _onWidgetMove, // Reserved for future drag-and-drop
  onWidgetDelete,
  scale = 4,
}: InteractivePhoneSimulatorProps) {
  void _onWidgetMove; // Suppress unused warning
  const device = DEVICE_PRESETS[deviceType];
  const frame = PHONE_FRAMES[deviceType] || PHONE_FRAMES.iphone_15;

  const screenWidth = frame.frameWidth - frame.screenInset.left - frame.screenInset.right;
  const screenHeight = frame.frameHeight - frame.screenInset.top - frame.screenInset.bottom;

  // Handle keyboard delete
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedWidgetId) {
      e.preventDefault();
      onWidgetDelete(selectedWidgetId);
    }
    if (e.key === 'Escape') {
      onWidgetSelect(null);
    }
  }, [selectedWidgetId, onWidgetDelete, onWidgetSelect]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Calculate cell dimensions
  const padding = 4 * scale;
  const statusBarHeight = 15 * scale;
  const availableWidth = screenWidth * scale - padding * 2;
  const availableHeight = screenHeight * scale - padding * 2 - statusBarHeight;
  const cellWidth = availableWidth / screen.gridColumns;
  const cellHeight = availableHeight / screen.gridRows;

  return (
    <div className="flex flex-col items-center">
      {/* Device name */}
      <div className="text-sm font-medium text-gray-600 mb-4">
        {device?.name || 'Unknown Device'}
      </div>

      {/* Phone frame */}
      <div
        className="relative select-none"
        style={{
          width: frame.frameWidth * scale,
          height: frame.frameHeight * scale,
        }}
      >
        {/* Outer frame */}
        <div
          className="absolute inset-0 shadow-2xl"
          style={{
            backgroundColor: frame.frameColor,
            borderRadius: frame.cornerRadius * scale,
            boxShadow: `
              0 25px 50px -12px rgba(0, 0, 0, 0.5),
              inset 0 1px 0 rgba(255, 255, 255, 0.1),
              inset 0 -1px 0 rgba(0, 0, 0, 0.3)
            `,
          }}
        />

        {/* Inner bezel */}
        <div
          className="absolute"
          style={{
            top: 2 * scale,
            left: 2 * scale,
            right: 2 * scale,
            bottom: 2 * scale,
            backgroundColor: frame.bezelColor,
            borderRadius: (frame.cornerRadius - 2) * scale,
          }}
        />

        {/* Screen area */}
        <div
          className="absolute overflow-hidden"
          style={{
            top: frame.screenInset.top * scale,
            left: frame.screenInset.left * scale,
            width: screenWidth * scale,
            height: screenHeight * scale,
            borderRadius: (frame.cornerRadius - 4) * scale,
            backgroundColor: LCD_COLORS.background,
          }}
          onClick={() => onWidgetSelect(null)}
        >
          {/* Status bar */}
          <div
            className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 z-10"
            style={{ height: 12 * scale, backgroundColor: LCD_COLORS.background }}
          >
            <span style={{ fontSize: 7 * scale, color: LCD_COLORS.text }}>9:41</span>
            <div
              className="rounded-sm"
              style={{
                width: 14 * scale,
                height: 7 * scale,
                backgroundColor: LCD_COLORS.text,
                opacity: 0.6,
              }}
            />
          </div>

          {/* Dynamic Island */}
          {frame.notchType === 'dynamic_island' && (
            <div
              className="absolute left-1/2 -translate-x-1/2 bg-black z-20"
              style={{
                top: 3 * scale,
                width: (frame.notchWidth || 25) * scale,
                height: (frame.notchHeight || 8) * scale,
                borderRadius: 10 * scale,
              }}
            />
          )}

          {/* Grid lines */}
          <svg
            className="absolute pointer-events-none"
            style={{
              top: statusBarHeight,
              left: padding,
              width: availableWidth,
              height: availableHeight,
            }}
          >
            {/* Vertical lines */}
            {Array.from({ length: screen.gridColumns + 1 }).map((_, i) => (
              <line
                key={`v-${i}`}
                x1={i * cellWidth}
                y1={0}
                x2={i * cellWidth}
                y2={availableHeight}
                stroke={LCD_COLORS.border}
                strokeWidth={1}
                opacity={0.3}
              />
            ))}
            {/* Horizontal lines */}
            {Array.from({ length: screen.gridRows + 1 }).map((_, i) => (
              <line
                key={`h-${i}`}
                x1={0}
                y1={i * cellHeight}
                x2={availableWidth}
                y2={i * cellHeight}
                stroke={LCD_COLORS.border}
                strokeWidth={1}
                opacity={0.3}
              />
            ))}
          </svg>

          {/* Widgets */}
          {screen.widgets.map((widget) => (
            <InteractiveWidget
              key={widget.id}
              widget={widget}
              cellWidth={cellWidth}
              cellHeight={cellHeight}
              offsetX={padding}
              offsetY={statusBarHeight}
              scale={scale}
              isSelected={widget.id === selectedWidgetId}
              onClick={() => onWidgetSelect(widget.id)}
            />
          ))}

          {/* Empty state */}
          {screen.widgets.length === 0 && (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ top: statusBarHeight }}
            >
              <div className="text-center" style={{ color: LCD_COLORS.textSecondary }}>
                <svg
                  className="mx-auto mb-2"
                  style={{ width: 24 * scale, height: 24 * scale }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                </svg>
                <p style={{ fontSize: 8 * scale }}>Add widgets from sidebar</p>
              </div>
            </div>
          )}
        </div>

        {/* Side buttons */}
        <div
          className="absolute bg-gray-600 rounded-sm"
          style={{ right: -2 * scale, top: 30 * scale, width: 2 * scale, height: 12 * scale }}
        />
        <div
          className="absolute bg-gray-600 rounded-sm"
          style={{ left: -2 * scale, top: 25 * scale, width: 2 * scale, height: 8 * scale }}
        />
        <div
          className="absolute bg-gray-600 rounded-sm"
          style={{ left: -2 * scale, top: 38 * scale, width: 2 * scale, height: 14 * scale }}
        />
      </div>
    </div>
  );
}

// Interactive widget component
function InteractiveWidget({
  widget,
  cellWidth,
  cellHeight,
  offsetX,
  offsetY,
  scale,
  isSelected,
  onClick,
}: {
  widget: Widget;
  cellWidth: number;
  cellHeight: number;
  offsetX: number;
  offsetY: number;
  scale: number;
  isSelected: boolean;
  onClick: () => void;
}) {
  const definition = WIDGET_DEFINITIONS[widget.type];
  const value = SAMPLE_VALUES[widget.type] || '---';

  const x = offsetX + widget.x * cellWidth;
  const y = offsetY + widget.y * cellHeight;
  const width = widget.width * cellWidth - 2;
  const height = widget.height * cellHeight - 2;

  // Font sizing
  const baseValueSize = Math.min(width * 0.35, height * 0.35);
  const valueFontSize = Math.max(baseValueSize, 10 * scale);
  const labelFontSize = Math.max(5 * scale, 8);
  const unitFontSize = Math.max(4 * scale, 6);

  const label = definition?.shortLabel || definition?.label || widget.type;
  const showLabel = height > 25 * scale;
  const showUnit = height > 20 * scale && definition?.unit;

  return (
    <div
      className={`absolute flex flex-col items-center justify-center cursor-pointer transition-all ${
        isSelected ? 'ring-2 ring-blue-500 ring-offset-1' : 'hover:ring-2 hover:ring-blue-300'
      }`}
      style={{
        left: x + 1,
        top: y + 1,
        width,
        height,
        backgroundColor: isSelected ? '#e0f2fe' : LCD_COLORS.background,
        border: `1px solid ${isSelected ? '#3b82f6' : LCD_COLORS.border}`,
        borderRadius: 3,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {/* Value */}
      <span
        className="font-bold font-mono leading-none"
        style={{
          fontSize: valueFontSize,
          color: LCD_COLORS.text,
        }}
      >
        {value}
      </span>

      {/* Unit */}
      {showUnit && (
        <span
          className="leading-none"
          style={{
            fontSize: unitFontSize,
            color: LCD_COLORS.textSecondary,
            marginTop: 2,
          }}
        >
          {definition.unit}
        </span>
      )}

      {/* Label */}
      {showLabel && (
        <span
          className="absolute bottom-0 left-0 right-0 text-center leading-none overflow-hidden whitespace-nowrap"
          style={{
            fontSize: labelFontSize,
            color: LCD_COLORS.textSecondary,
            paddingBottom: 2,
          }}
        >
          {label}
        </span>
      )}

      {/* Selection indicator */}
      {isSelected && (
        <div
          className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center"
          style={{ width: 12, height: 12 }}
        >
          <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      )}
    </div>
  );
}
