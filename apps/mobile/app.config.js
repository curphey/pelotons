export default {
  expo: {
    name: "Peloton",
    slug: "peloton",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#0066cc"
    },
    assetBundlePatterns: ["**/*"],
    ios: {
      supportsTablet: false,
      bundleIdentifier: "com.peloton.bikecomputer",
      infoPlist: {
        NSLocationWhenInUseUsageDescription: "Peloton needs your location to track your ride and show your position on the map.",
        NSLocationAlwaysAndWhenInUseUsageDescription: "Peloton needs background location access to continue tracking your ride when the app is in the background.",
        NSBluetoothAlwaysUsageDescription: "Peloton needs Bluetooth access to connect to heart rate monitors, power meters, and other cycling sensors.",
        NSBluetoothPeripheralUsageDescription: "Peloton needs Bluetooth access to connect to cycling sensors.",
        UIBackgroundModes: ["location", "bluetooth-central"]
      },
      config: {
        usesNonExemptEncryption: false
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#0066cc"
      },
      package: "com.peloton.bikecomputer",
      permissions: [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "ACCESS_BACKGROUND_LOCATION",
        "BLUETOOTH",
        "BLUETOOTH_ADMIN",
        "BLUETOOTH_CONNECT",
        "BLUETOOTH_SCAN"
      ]
    },
    plugins: [
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission: "Peloton needs background location access to continue tracking your ride."
        }
      ],
      [
        "@rnmapbox/maps",
        {
          RNMapboxMapsImpl: "mapbox",
          RNMapboxMapsDownloadToken: process.env.MAPBOX_SECRET_TOKEN || "YOUR_MAPBOX_SECRET_TOKEN"
        }
      ]
    ],
    extra: {
      supabaseUrl: process.env.SUPABASE_URL,
      supabasePublishableKey: process.env.SUPABASE_PUBLISHABLE_KEY,
      mapboxToken: process.env.MAPBOX_TOKEN,
      eas: {
        projectId: "your-project-id"
      }
    }
  }
};
