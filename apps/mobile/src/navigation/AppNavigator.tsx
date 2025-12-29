import React from 'react';
import { Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../hooks/useAuth';

// Screens
import { LoginScreen } from '../screens/LoginScreen';
import { MapScreen } from '../screens/MapScreen';
import { DataScreen } from '../screens/DataScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { SensorPairingScreen } from '../screens/SensorPairingScreen';

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  SensorPairing: undefined;
};

export type MainTabParamList = {
  Map: undefined;
  Data: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1a1a1a',
          borderTopColor: '#333',
        },
        tabBarActiveTintColor: '#0066cc',
        tabBarInactiveTintColor: '#888',
      }}
    >
      <Tab.Screen
        name="Map"
        component={MapScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MapIcon color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Data"
        component={DataScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <DataIcon color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <SettingsIcon color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// Simple text-based icons (SVG not supported in RN without react-native-svg)
function MapIcon({ color }: { color: string; size: number }) {
  return <Text style={{ color, fontSize: 20 }}>🗺️</Text>;
}

function DataIcon({ color }: { color: string; size: number }) {
  return <Text style={{ color, fontSize: 20 }}>📊</Text>;
}

function SettingsIcon({ color }: { color: string; size: number }) {
  return <Text style={{ color, fontSize: 20 }}>⚙️</Text>;
}

export function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return null; // Or a loading screen
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen
              name="SensorPairing"
              component={SensorPairingScreen}
              options={{
                presentation: 'modal',
                headerShown: true,
                headerTitle: 'Pair Sensor',
              }}
            />
          </>
        ) : (
          <Stack.Screen name="Auth" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
