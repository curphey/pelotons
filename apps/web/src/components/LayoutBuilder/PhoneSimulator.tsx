import { useState, useRef, useEffect } from 'react';
import {
  ProfileScreen,
  Widget,
  DEVICE_PRESETS,
  WIDGET_DEFINITIONS,
  LCD_COLORS,
} from '@peloton/shared';

interface PhoneSimulatorProps {
  deviceType: string;
  screens: ProfileScreen[];
  currentScreenIndex?: number;
  onScreenChange?: (index: number) => void;
  onScreenSelect?: (screen: ProfileScreen) => void;
  scale?: number;
}

// Phone frame dimensions and features for each device type
const PHONE_FRAMES: Record<string, {
  frameWidth: number;
  frameHeight: number;
  screenInset: { top: number; bottom: number; left: number; right: number };
  cornerRadius: number;
  notchType: 'none' | 'notch' | 'dynamic_island';
  notchWidth?: number;
  notchHeight?: number;
  hasHomeButton?: boolean;
  bezelColor: string;
  frameColor: string;
}> = {
  iphone_se: {
    frameWidth: 67,
    frameHeight: 138,
    screenInset: { top: 20, bottom: 20, left: 4, right: 4 },
    cornerRadius: 10,
    notchType: 'none',
    hasHomeButton: true,
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
    frameColor: '#4a4a52', // Titanium
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
    frameColor: '#4a4a52', // Titanium
  },
};

// Sample data values for preview
const SAMPLE_VALUES: Record<string, string> = {
  // Speed
  speed: '28.5',
  speed_avg: '27.8',
  speed_max: '52.3',
  speed_lap: '29.1',
  speed_3s: '28.2',
  pace: '2:06',
  pace_avg: '2:09',
  // Power
  power: '245',
  power_3s: '248',
  power_10s: '242',
  power_30s: '238',
  power_avg: '235',
  power_max: '892',
  power_lap: '251',
  power_normalized: '248',
  power_per_kg: '3.5',
  power_ftp_percent: '88',
  power_zone: 'Z3',
  power_if: '0.92',
  power_balance: '51/49',
  // Heart rate
  heart_rate: '142',
  heart_rate_avg: '138',
  heart_rate_max: '172',
  heart_rate_lap: '145',
  heart_rate_zone: 'Z3',
  heart_rate_percent_max: '78',
  // Cadence
  cadence: '92',
  cadence_avg: '89',
  cadence_max: '112',
  // Distance
  distance: '42.5',
  distance_lap: '2.3',
  distance_remaining: '18.2',
  distance_to_destination: '12.5',
  // Time
  time_elapsed: '1:23:45',
  time_lap: '4:32',
  time_last_lap: '4:28',
  time_moving: '1:21:30',
  time_of_day: '14:32',
  time_eta: '16:45',
  time_remaining: '0:42:00',
  laps: '8',
  // Elevation
  elevation: '380',
  elevation_gain: '+1,240',
  elevation_loss: '-860',
  elevation_remaining: '+520',
  grade: '4.2',
  grade_avg: '3.8',
  vam: '892',
  // Navigation
  heading: 'NE',
  turn_distance: '250',
  off_course: '0',
  // Performance
  calories: '847',
  kilojoules: '1,420',
  tss: '78',
  // Gears
  gear: '52x11',
  gear_combo: '52/11',
  gear_ratio: '4.73',
  // Environment
  temperature: '22',
  battery_level: '87',
  wind_speed: '12',
  // Generic fallback
  map_mini: '',
};

export function PhoneSimulator({
  deviceType,
  screens,
  currentScreenIndex = 0,
  onScreenChange,
  onScreenSelect,
  scale = 1,
}: PhoneSimulatorProps) {
  const [activeIndex, setActiveIndex] = useState(currentScreenIndex);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [dragStart, setDragStart] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const device = DEVICE_PRESETS[deviceType];
  const frame = PHONE_FRAMES[deviceType] || PHONE_FRAMES.iphone_15;

  // Update active index when prop changes
  useEffect(() => {
    setActiveIndex(currentScreenIndex);
  }, [currentScreenIndex]);

  // Calculate screen dimensions within the phone frame
  const screenWidth = frame.frameWidth - frame.screenInset.left - frame.screenInset.right;
  const screenHeight = frame.frameHeight - frame.screenInset.top - frame.screenInset.bottom;

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (screens.length <= 1) return;
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    setDragStart(clientX);
  };

  const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const offset = (clientX - dragStart) / scale;
    setDragOffset(offset);
  };

  const handleDragEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    // Determine if we should change screens
    const threshold = screenWidth * 0.3;
    if (dragOffset < -threshold && activeIndex < screens.length - 1) {
      const newIndex = activeIndex + 1;
      setActiveIndex(newIndex);
      onScreenChange?.(newIndex);
    } else if (dragOffset > threshold && activeIndex > 0) {
      const newIndex = activeIndex - 1;
      setActiveIndex(newIndex);
      onScreenChange?.(newIndex);
    }

    setDragOffset(0);
    setDragStart(0);
  };

  const goToScreen = (index: number) => {
    setActiveIndex(index);
    onScreenChange?.(index);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Device name label */}
      <div className="text-sm font-medium text-gray-600">
        {device?.name || 'Unknown Device'}
      </div>

      {/* Phone frame */}
      <div
        ref={containerRef}
        className="relative select-none"
        style={{
          width: frame.frameWidth * scale,
          height: frame.frameHeight * scale,
          transform: `scale(${scale > 1 ? 1 : scale})`,
          transformOrigin: 'top center',
        }}
      >
        {/* Outer frame (metal/titanium edge) */}
        <div
          className="absolute inset-0 rounded-[inherit] shadow-2xl"
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
            backgroundColor: '#000',
          }}
          onMouseDown={handleDragStart}
          onMouseMove={handleDragMove}
          onMouseUp={handleDragEnd}
          onMouseLeave={handleDragEnd}
          onTouchStart={handleDragStart}
          onTouchMove={handleDragMove}
          onTouchEnd={handleDragEnd}
        >
          {/* Status bar area */}
          <div
            className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 z-10"
            style={{ height: 10 * scale }}
          >
            <span className="text-white text-[8px] font-medium" style={{ fontSize: 6 * scale }}>
              9:41
            </span>
            <div className="flex items-center gap-1">
              <div className="w-4 h-2 bg-white/80 rounded-sm" style={{ width: 12 * scale, height: 6 * scale }} />
            </div>
          </div>

          {/* Notch or Dynamic Island */}
          {frame.notchType === 'notch' && (
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 bg-black z-20"
              style={{
                width: (frame.notchWidth || 35) * scale,
                height: (frame.notchHeight || 7) * scale,
                borderBottomLeftRadius: 8 * scale,
                borderBottomRightRadius: 8 * scale,
              }}
            />
          )}
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

          {/* Home button indicator for SE */}
          {frame.hasHomeButton && (
            <div
              className="absolute bottom-1 left-1/2 -translate-x-1/2 rounded-full border border-gray-600"
              style={{
                width: 12 * scale,
                height: 12 * scale,
              }}
            />
          )}

          {/* Screens carousel */}
          <div
            className="absolute inset-0 flex transition-transform duration-300 ease-out"
            style={{
              transform: `translateX(${(-activeIndex * screenWidth + (isDragging ? dragOffset : 0)) * scale}px)`,
              transitionDuration: isDragging ? '0ms' : '300ms',
            }}
          >
            {screens.map((screen) => (
              <div
                key={screen.id}
                className="flex-shrink-0 cursor-pointer"
                style={{
                  width: screenWidth * scale,
                  height: screenHeight * scale,
                }}
                onClick={() => !isDragging && onScreenSelect?.(screen)}
              >
                <ScreenPreview
                  screen={screen}
                  screenWidth={screenWidth}
                  screenHeight={screenHeight}
                  scale={scale}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Side button (power) */}
        <div
          className="absolute bg-gray-600 rounded-sm"
          style={{
            right: -2 * scale,
            top: 30 * scale,
            width: 2 * scale,
            height: 12 * scale,
          }}
        />

        {/* Volume buttons */}
        <div
          className="absolute bg-gray-600 rounded-sm"
          style={{
            left: -2 * scale,
            top: 25 * scale,
            width: 2 * scale,
            height: 8 * scale,
          }}
        />
        <div
          className="absolute bg-gray-600 rounded-sm"
          style={{
            left: -2 * scale,
            top: 38 * scale,
            width: 2 * scale,
            height: 14 * scale,
          }}
        />
      </div>

      {/* Screen indicator dots */}
      {screens.length > 1 && (
        <div className="flex items-center gap-2">
          {screens.map((_, index) => (
            <button
              key={index}
              className={`rounded-full transition-all ${
                index === activeIndex
                  ? 'bg-blue-600 w-6 h-2'
                  : 'bg-gray-300 hover:bg-gray-400 w-2 h-2'
              }`}
              onClick={() => goToScreen(index)}
            />
          ))}
        </div>
      )}

      {/* Navigation hint */}
      {screens.length > 1 && (
        <p className="text-xs text-gray-500">
          Swipe or click dots to navigate between screens
        </p>
      )}
    </div>
  );
}

// Screen preview component that renders widgets
function ScreenPreview({
  screen,
  screenWidth,
  screenHeight,
  scale,
}: {
  screen: ProfileScreen;
  screenWidth: number;
  screenHeight: number;
  scale: number;
}) {
  // For map screens, show a map placeholder
  if (screen.screenType === 'map') {
    return (
      <div
        className="w-full h-full flex flex-col items-center justify-center"
        style={{ backgroundColor: '#1a3a2a' }}
      >
        <svg
          className="w-12 h-12 text-green-400 opacity-50"
          style={{ width: 30 * scale, height: 30 * scale }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
          />
        </svg>
        <span
          className="text-green-400 opacity-75 font-medium mt-2"
          style={{ fontSize: 8 * scale }}
        >
          {screen.name}
        </span>
      </div>
    );
  }

  // Calculate cell size based on screen dimensions and grid
  const padding = 4 * scale;
  const availableWidth = screenWidth * scale - padding * 2;
  const availableHeight = screenHeight * scale - padding * 2 - (15 * scale); // Account for status bar
  const cellWidth = availableWidth / screen.gridColumns;
  const cellHeight = availableHeight / screen.gridRows;

  return (
    <div
      className="w-full h-full relative"
      style={{ backgroundColor: LCD_COLORS.background, paddingTop: 15 * scale }}
    >
      {/* Grid lines */}
      <svg
        className="absolute inset-0 pointer-events-none"
        style={{ top: 15 * scale, left: padding, right: padding, bottom: 0 }}
        width={availableWidth}
        height={availableHeight}
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
            strokeWidth={0.5}
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
            strokeWidth={0.5}
            opacity={0.3}
          />
        ))}
      </svg>

      {/* Widgets */}
      {screen.widgets.map((widget) => (
        <WidgetPreview
          key={widget.id}
          widget={widget}
          cellWidth={cellWidth}
          cellHeight={cellHeight}
          offsetX={padding}
          offsetY={15 * scale}
          scale={scale}
        />
      ))}

      {/* Empty state */}
      {screen.widgets.length === 0 && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ top: 15 * scale }}
        >
          <span
            className="text-gray-500 text-center"
            style={{ fontSize: 8 * scale }}
          >
            No widgets
          </span>
        </div>
      )}
    </div>
  );
}

// Individual widget preview
function WidgetPreview({
  widget,
  cellWidth,
  cellHeight,
  offsetX,
  offsetY,
  scale,
}: {
  widget: Widget;
  cellWidth: number;
  cellHeight: number;
  offsetX: number;
  offsetY: number;
  scale: number;
}) {
  const definition = WIDGET_DEFINITIONS[widget.type];
  const value = SAMPLE_VALUES[widget.type] || '---';

  const x = offsetX + widget.x * cellWidth;
  const y = offsetY + widget.y * cellHeight;
  const width = widget.width * cellWidth - 2;
  const height = widget.height * cellHeight - 2;

  // Calculate font sizes based on widget size - more aggressive scaling
  const baseValueSize = Math.min(width * 0.4, height * 0.4);
  const valueFontSize = Math.max(baseValueSize, 8 * scale);
  const labelFontSize = Math.max(4 * scale, 6);
  const unitFontSize = Math.max(3 * scale, 5);

  // Use short label for small widgets, fall back to abbreviation
  const label = definition?.shortLabel || definition?.label || widget.type;
  // Abbreviate long labels for small cells
  const displayLabel = width < 25 * scale
    ? label.slice(0, 4) + (label.length > 4 ? '' : '')
    : label;

  // Hide label if widget is too small
  const showLabel = height > 20 * scale;
  const showUnit = height > 15 * scale && definition?.unit;

  return (
    <div
      className="absolute flex flex-col items-center justify-center overflow-hidden"
      style={{
        left: x + 1,
        top: y + 1,
        width,
        height,
        backgroundColor: LCD_COLORS.background,
        border: `1px solid ${LCD_COLORS.border}`,
        borderRadius: 2,
        padding: 1,
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
            paddingBottom: 1,
          }}
        >
          {displayLabel}
        </span>
      )}
    </div>
  );
}
