import { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  PanResponder,
  PanResponderGestureState,
} from 'react-native';
import {
  Widget,
  WIDGET_DEFINITIONS,
  LCD_COLORS,
  ProfileScreen,
  AthleteProfile,
  getPowerZoneColor,
  getHeartRateZoneColor,
} from '@peloton/shared';
import { useActiveProfile } from '../hooks/useActiveProfile';
import { useAthleteProfile } from '../hooks/useAthleteProfile';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SAFE_AREA_TOP = 60;
const SAFE_AREA_BOTTOM = 100;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.2;
const SWIPE_VELOCITY_THRESHOLD = 500;

// Mock data for demo - in real app this comes from sensors
const MOCK_DATA: Record<string, number> = {
  heart_rate: 142,
  heart_rate_avg: 138,
  heart_rate_max: 175,
  power: 245,
  power_3s: 238,
  power_10s: 240,
  power_30s: 235,
  power_avg: 215,
  power_max: 892,
  power_lap: 250,
  power_normalized: 228,
  power_ftp_percent: 82,
  speed: 28.5,
  speed_avg: 25.2,
  speed_max: 52.1,
  cadence: 92,
  cadence_avg: 88,
  distance: 42.5,
  elevation: 385,
  elevation_gain: 892,
  grade: 4.2,
  calories: 1245,
  temperature: 22,
  vam: 850,
};

// String values for display
const MOCK_DISPLAY: Record<string, string> = {
  time_elapsed: '1:23:45',
  time_lap: '4:32',
  gear: '50-17',
  power_zone: 'Z3',
  heart_rate_zone: 'Z2',
};

// Widget types that support zone coloring
const POWER_ZONE_WIDGETS = [
  'power', 'power_3s', 'power_10s', 'power_30s', 'power_lap',
  'power_zone', 'power_ftp_percent',
];
const HR_ZONE_WIDGETS = [
  'heart_rate', 'heart_rate_zone', 'heart_rate_percent_max',
];


export function DataScreen() {
  const { profile, loading: profileLoading, isConnected } = useActiveProfile();
  const { profile: athleteProfile } = useAthleteProfile();
  const [currentScreenIndex, setCurrentScreenIndex] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;

  // Get data screens from profile
  const screens: ProfileScreen[] = profile?.screens.filter(s => s.screenType === 'data') || [];
  const currentScreen = screens[currentScreenIndex];

  const goToScreen = useCallback((index: number) => {
    if (index < 0 || index >= screens.length) return;

    Animated.spring(translateX, {
      toValue: -index * SCREEN_WIDTH,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();

    setCurrentScreenIndex(index);
  }, [screens.length, translateX]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => screens.length > 1,
      onMoveShouldSetPanResponder: (_, gestureState: PanResponderGestureState) => {
        return screens.length > 1 && Math.abs(gestureState.dx) > 5;
      },
      onPanResponderMove: (_, gestureState: PanResponderGestureState) => {
        const newX = -currentScreenIndex * SCREEN_WIDTH + gestureState.dx;
        const boundedX = Math.max(
          -(screens.length - 1) * SCREEN_WIDTH - SCREEN_WIDTH * 0.2,
          Math.min(SCREEN_WIDTH * 0.2, newX)
        );
        translateX.setValue(boundedX);
      },
      onPanResponderRelease: (_, gestureState: PanResponderGestureState) => {
        const { dx, vx } = gestureState;

        if (dx < -SWIPE_THRESHOLD || vx < -SWIPE_VELOCITY_THRESHOLD / 1000) {
          goToScreen(Math.min(currentScreenIndex + 1, screens.length - 1));
        } else if (dx > SWIPE_THRESHOLD || vx > SWIPE_VELOCITY_THRESHOLD / 1000) {
          goToScreen(Math.max(currentScreenIndex - 1, 0));
        } else {
          goToScreen(currentScreenIndex);
        }
      },
    })
  ).current;

  if (profileLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading layout...</Text>
      </View>
    );
  }

  // No profile or no screens configured
  if (!profile || screens.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateTitle}>No Layout Configured</Text>
          <Text style={styles.emptyStateText}>
            Create a data profile in the web app to customize your display.
          </Text>
          <Text style={styles.emptyStateUrl}>pelotons.cc/layout</Text>
          <View style={[styles.syncIndicator, isConnected && styles.syncIndicatorConnected, styles.emptyStateSyncIndicator]} />
          <Text style={styles.emptyStateSyncText}>
            {isConnected ? 'Connected - changes will sync automatically' : 'Connecting...'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Screen name */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.screenName}>{currentScreen?.name || 'Data'}</Text>
          {/* Sync indicator */}
          <View style={[styles.syncIndicator, isConnected && styles.syncIndicatorConnected]} />
        </View>
        {screens.length > 1 && (
          <Text style={styles.screenIndicator}>
            {currentScreenIndex + 1} / {screens.length}
          </Text>
        )}
      </View>

      {/* Swipeable screens */}
      <View style={styles.screenContainer} {...panResponder.panHandlers}>
        <Animated.View
          style={[
            styles.screensRow,
            {
              width: SCREEN_WIDTH * screens.length,
              transform: [{ translateX }],
            },
          ]}
        >
          {screens.map((screen) => (
            <View key={screen.id} style={styles.screenWrapper}>
              <WidgetGrid
                widgets={screen.widgets}
                gridColumns={screen.gridColumns}
                gridRows={screen.gridRows}
                athleteProfile={athleteProfile}
              />
            </View>
          ))}
        </Animated.View>
      </View>

      {/* Page dots */}
      {screens.length > 1 && (
        <View style={styles.pageDots}>
          {screens.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentScreenIndex && styles.dotActive,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

interface WidgetGridProps {
  widgets: Widget[];
  gridColumns: number;
  gridRows: number;
  athleteProfile: AthleteProfile | null;
}

function WidgetGrid({ widgets, gridColumns, gridRows, athleteProfile }: WidgetGridProps) {
  const availableHeight = SCREEN_HEIGHT - SAFE_AREA_TOP - SAFE_AREA_BOTTOM;
  const cellWidth = SCREEN_WIDTH / gridColumns;
  const cellHeight = availableHeight / gridRows;

  return (
    <View style={styles.grid}>
      {widgets.map((widget) => (
        <WidgetCell
          key={widget.id}
          widget={widget}
          cellWidth={cellWidth}
          cellHeight={cellHeight}
          athleteProfile={athleteProfile}
        />
      ))}
    </View>
  );
}

interface WidgetCellProps {
  widget: Widget;
  cellWidth: number;
  cellHeight: number;
  athleteProfile: AthleteProfile | null;
}

function WidgetCell({ widget, cellWidth, cellHeight, athleteProfile }: WidgetCellProps) {
  const definition = WIDGET_DEFINITIONS[widget.type];
  const numericValue = MOCK_DATA[widget.type];
  const displayValue = MOCK_DISPLAY[widget.type];
  const valueStr = displayValue ?? numericValue?.toString() ?? '---';

  const width = widget.width * cellWidth - 4;
  const height = widget.height * cellHeight - 4;

  // Calculate optimal font size
  const fontSize = calculateOptimalFontSize(
    valueStr,
    width - 16,
    height - 40,
    widget.config?.fontSizePreference || 'auto'
  );

  // Calculate zone color for power/HR widgets
  let zoneColor: string | null = null;
  const useZoneBackground = widget.config?.zoneColors !== false; // Default to showing zone colors

  if (useZoneBackground && athleteProfile) {
    if (POWER_ZONE_WIDGETS.includes(widget.type) && athleteProfile.ftpWatts) {
      // For power widgets, get zone color based on current power
      const powerValue = MOCK_DATA['power'] || MOCK_DATA['power_3s'] || 0;
      zoneColor = getPowerZoneColor(powerValue, athleteProfile.ftpWatts);
    } else if (HR_ZONE_WIDGETS.includes(widget.type) && athleteProfile.maxHrBpm) {
      // For HR widgets, get zone color based on current HR
      const hrValue = MOCK_DATA['heart_rate'] || 0;
      zoneColor = getHeartRateZoneColor(hrValue, athleteProfile.maxHrBpm, athleteProfile.lthrBpm);
    }
  }

  const cellStyle = {
    position: 'absolute' as const,
    left: widget.x * cellWidth + 2,
    top: widget.y * cellHeight + 2,
    width,
    height,
  };

  // When zone color is active, use darker text for contrast
  const hasZoneColor = !!zoneColor;
  const textColor = hasZoneColor ? '#ffffff' : LCD_COLORS.text;
  const labelColor = hasZoneColor ? 'rgba(255,255,255,0.8)' : LCD_COLORS.textSecondary;

  return (
    <View
      style={[
        styles.widget,
        cellStyle,
        zoneColor ? { backgroundColor: zoneColor, borderColor: zoneColor } : null,
      ]}
    >
      <Text style={[styles.widgetValue, { fontSize, color: textColor }]}>
        {valueStr}
      </Text>
      {definition?.unit && (
        <Text style={[styles.widgetUnit, { fontSize: Math.max(10, fontSize * 0.35), color: labelColor }]}>
          {definition.unit}
        </Text>
      )}
      <Text style={[styles.widgetLabel, { fontSize: Math.max(8, fontSize * 0.3), color: labelColor }]}>
        {definition?.shortLabel || definition?.label || widget.type}
      </Text>
    </View>
  );
}

/**
 * Calculate optimal font size based on widget dimensions and content
 */
function calculateOptimalFontSize(
  text: string,
  availableWidth: number,
  availableHeight: number,
  preference: 'auto' | 'small' | 'medium' | 'large' = 'auto'
): number {
  const multipliers = { small: 0.6, medium: 0.8, large: 1.0, auto: 1.0 };

  const heightBasedSize = availableHeight * 0.45;
  const charWidthRatio = 0.65;
  const widthBasedSize = (availableWidth * 0.9) / (text.length * charWidthRatio);
  const autoSize = Math.min(heightBasedSize, widthBasedSize);
  const finalSize = autoSize * multipliers[preference];

  return Math.max(16, Math.min(72, finalSize));
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: LCD_COLORS.background,
  },
  loadingText: {
    color: LCD_COLORS.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 150,
  },
  header: {
    paddingTop: SAFE_AREA_TOP,
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  screenName: {
    fontSize: 18,
    fontWeight: '600',
    color: LCD_COLORS.text,
  },
  syncIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: LCD_COLORS.textSecondary,
    opacity: 0.4,
  },
  syncIndicatorConnected: {
    backgroundColor: '#22c55e',
    opacity: 1,
  },
  screenIndicator: {
    fontSize: 14,
    color: LCD_COLORS.textSecondary,
  },
  screenContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  screensRow: {
    flexDirection: 'row',
    flex: 1,
  },
  screenWrapper: {
    width: SCREEN_WIDTH,
    flex: 1,
  },
  grid: {
    flex: 1,
    position: 'relative',
  },
  widget: {
    backgroundColor: LCD_COLORS.background,
    borderWidth: 1,
    borderColor: LCD_COLORS.border,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  widgetValue: {
    fontWeight: 'bold',
    color: LCD_COLORS.text,
    fontFamily: 'Menlo',
    textAlign: 'center',
  },
  widgetUnit: {
    color: LCD_COLORS.textSecondary,
    marginTop: 2,
  },
  widgetLabel: {
    color: LCD_COLORS.textSecondary,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pageDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    paddingBottom: SAFE_AREA_BOTTOM - 60,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: LCD_COLORS.textSecondary,
    opacity: 0.4,
  },
  dotActive: {
    backgroundColor: LCD_COLORS.text,
    opacity: 1,
    transform: [{ scale: 1.25 }],
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: LCD_COLORS.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: LCD_COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 24,
  },
  emptyStateUrl: {
    fontSize: 18,
    fontWeight: '600',
    color: LCD_COLORS.text,
    marginBottom: 32,
  },
  emptyStateSyncIndicator: {
    marginBottom: 8,
  },
  emptyStateSyncText: {
    fontSize: 12,
    color: LCD_COLORS.textSecondary,
  },
});
