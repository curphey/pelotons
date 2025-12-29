import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Widget, WIDGET_DEFINITIONS, LCD_COLORS } from '@peloton/shared';
// Supabase temporarily disabled - using default layout
// import { supabase, DbLayout } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_COLUMNS = 3;
const GRID_ROWS = 4;
const CELL_WIDTH = SCREEN_WIDTH / GRID_COLUMNS;
const CELL_HEIGHT = (Dimensions.get('window').height - 200) / GRID_ROWS;

// Mock data for demo
const MOCK_DATA: Record<string, string | number> = {
  heart_rate: 142,
  power: 245,
  speed: 28.5,
  cadence: 92,
  time: '1:23:45',
  distance: 42.5,
  elevation: '+380',
  gear: '52x11',
};

export function DataScreen() {
  const { user } = useAuth();
  const [layout, setLayout] = useState<Widget[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActiveLayout();
  }, [user]);

  const loadActiveLayout = async () => {
    // Supabase temporarily disabled - use default layout
    setLayout([
      { id: 'w1', type: 'speed', x: 0, y: 0, width: 1, height: 1 },
      { id: 'w2', type: 'heart_rate', x: 1, y: 0, width: 1, height: 1 },
      { id: 'w3', type: 'power', x: 2, y: 0, width: 1, height: 1 },
      { id: 'w4', type: 'time', x: 0, y: 1, width: 2, height: 1 },
      { id: 'w5', type: 'distance', x: 2, y: 1, width: 1, height: 1 },
      { id: 'w6', type: 'cadence', x: 0, y: 2, width: 1, height: 1 },
      { id: 'w7', type: 'elevation', x: 1, y: 2, width: 1, height: 1 },
      { id: 'w8', type: 'gear', x: 2, y: 2, width: 1, height: 1 },
    ]);
    setLoading(false);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading layout...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {layout.map((widget) => (
          <WidgetCell key={widget.id} widget={widget} />
        ))}
      </View>
    </View>
  );
}

interface WidgetCellProps {
  widget: Widget;
}

function WidgetCell({ widget }: WidgetCellProps) {
  const definition = WIDGET_DEFINITIONS[widget.type];
  const value = MOCK_DATA[widget.type];

  const cellStyle = {
    position: 'absolute' as const,
    left: widget.x * CELL_WIDTH,
    top: widget.y * CELL_HEIGHT,
    width: widget.width * CELL_WIDTH - 4,
    height: widget.height * CELL_HEIGHT - 4,
    margin: 2,
  };

  return (
    <View style={[styles.widget, cellStyle]}>
      <Text style={styles.widgetValue}>{value ?? '---'}</Text>
      {definition.unit && (
        <Text style={styles.widgetUnit}>{definition.unit}</Text>
      )}
      <Text style={styles.widgetLabel}>{definition.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: LCD_COLORS.background,
    paddingTop: 60,
    paddingBottom: 100,
  },
  loadingText: {
    color: LCD_COLORS.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 100,
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
    fontSize: 36,
    fontWeight: 'bold',
    color: LCD_COLORS.text,
    fontFamily: 'Menlo',
  },
  widgetUnit: {
    fontSize: 14,
    color: LCD_COLORS.textSecondary,
    marginTop: 2,
  },
  widgetLabel: {
    fontSize: 12,
    color: LCD_COLORS.textSecondary,
    marginTop: 4,
    textTransform: 'uppercase',
  },
});
