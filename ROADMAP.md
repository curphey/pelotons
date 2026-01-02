# Peloton Development Roadmap

This document outlines the planned features and development priorities for Peloton. Features are organized into phases, with each phase building upon the previous.

## Phase 1: User Profiles & Athlete Settings

Enable personalized metrics like W/kg, heart rate zones, and training recommendations.

### Athlete Profile

| Feature | Description | Priority |
|---------|-------------|----------|
| Basic Profile | Name, age, gender, weight, height | High |
| Weight Tracking | Historical weight with date entries | High |
| FTP (Functional Threshold Power) | Current FTP with history and test protocols | High |
| Heart Rate Zones | LTHR, max HR, resting HR, custom zone boundaries | High |
| Power Zones | Coggan 7-zone or custom power zones | High |
| Training Stress Balance | CTL, ATL, TSB tracking | Medium |
| VO2max Estimate | Calculated from power/HR data | Medium |
| Rider Type | Sprinter, climber, rouleur classification | Low |

### Profile-Dependent Widgets

Once user profiles are implemented, these widgets become functional:

- **W/kg (Watts per Kilogram)** - Real-time and averaged
- **%FTP** - Current power as percentage of threshold
- **Heart Rate Zones** - Color-coded zone display
- **Power Zones** - Color-coded zone display
- **IF (Intensity Factor)** - Requires FTP
- **TSS (Training Stress Score)** - Requires FTP
- **Kilojoules** - Accurate calorie estimation
- **Training Load** - Acute and chronic tracking

### Database Schema Additions

```sql
athlete_profiles
├── id               UUID PRIMARY KEY
├── user_id          UUID REFERENCES auth.users
├── display_name     TEXT
├── date_of_birth    DATE
├── gender           TEXT ('male' | 'female' | 'other')
├── current_weight_kg DECIMAL
├── height_cm        INTEGER
├── ftp_watts        INTEGER
├── lthr_bpm         INTEGER
├── max_hr_bpm       INTEGER
├── resting_hr_bpm   INTEGER
├── vo2max_estimate  DECIMAL
└── updated_at       TIMESTAMP

-- Body measurements for bike fitting (Zinn-style)
body_measurements
├── id               UUID PRIMARY KEY
├── user_id          UUID REFERENCES auth.users
├── measured_at      TIMESTAMP
├── source           TEXT ('manual' | 'lidar' | 'fit_file' | 'retul')
├── inseam_mm        INTEGER    -- Floor to crotch (book method)
├── torso_length_mm  INTEGER    -- Saddle to sternal notch
├── arm_length_mm    INTEGER    -- Acromion to wrist crease
├── forearm_length_mm INTEGER   -- Elbow to fingertip
├── shoulder_width_mm INTEGER   -- Acromion to acromion
├── thigh_length_mm  INTEGER    -- Greater trochanter to knee center
├── lower_leg_mm     INTEGER    -- Knee center to floor
├── foot_length_mm   INTEGER    -- Heel to toe
├── sit_bones_mm     INTEGER    -- Ischial tuberosity width
├── flexibility      TEXT       -- 'limited' | 'average' | 'good' | 'excellent'
├── notes            TEXT
└── is_current       BOOLEAN    -- Most recent measurement set

weight_history
├── id               UUID PRIMARY KEY
├── user_id          UUID REFERENCES auth.users
├── weight_kg        DECIMAL
├── recorded_at      DATE
└── source           TEXT ('manual' | 'strava' | 'garmin')

ftp_history
├── id               UUID PRIMARY KEY
├── user_id          UUID REFERENCES auth.users
├── ftp_watts        INTEGER
├── test_type        TEXT ('20min' | 'ramp' | 'manual')
├── recorded_at      DATE
└── notes            TEXT
```

---

## Phase 2: Ride Recording (Mobile App)

Transform Peloton from a display-only app to a full ride recording solution.

### Core Recording Features

| Feature | Description | Priority |
|---------|-------------|----------|
| GPS Recording | High-frequency location tracking with battery optimization | High |
| Sensor Data Logging | HR, power, cadence, speed with timestamps | High |
| Auto-Pause | Detect stops and pause recording automatically | High |
| Auto-Lap | Distance or location-based automatic laps | High |
| Manual Lap | Button to mark lap splits | High |
| Ride Summary | Post-ride statistics and charts | High |
| GPX/FIT Export | Standard file format export | High |
| Offline Recording | Full functionality without network | Medium |
| Live Tracking | Share location with friends/family | Medium |
| Segment Detection | Identify Strava-like segments during ride | Low |

### Recording Data Model

```typescript
interface RideRecording {
  id: string;
  userId: string;
  startedAt: Date;
  endedAt: Date;
  status: 'recording' | 'paused' | 'completed' | 'discarded';

  // Summary stats
  totalDistanceM: number;
  totalTimeMs: number;
  movingTimeMs: number;
  elevationGainM: number;
  elevationLossM: number;

  // Sensor summaries
  avgSpeedKmh: number;
  maxSpeedKmh: number;
  avgPowerWatts: number;
  maxPowerWatts: number;
  normalizedPower: number;
  avgHeartRate: number;
  maxHeartRate: number;
  avgCadence: number;

  // Calculated metrics (requires profile)
  tss: number;
  intensityFactor: number;
  kilojoules: number;

  // Raw data
  trackPoints: TrackPoint[];
  laps: Lap[];
}

interface TrackPoint {
  timestamp: number;
  latitude: number;
  longitude: number;
  elevation: number;
  heartRate?: number;
  power?: number;
  cadence?: number;
  speed?: number;
  temperature?: number;
}

interface Lap {
  number: number;
  startIndex: number;
  endIndex: number;
  trigger: 'manual' | 'distance' | 'location';
  distanceM: number;
  timeMs: number;
  avgPower?: number;
  avgHeartRate?: number;
}
```

### Mobile App Screens

1. **Pre-Ride Screen**
   - Select route (optional)
   - Confirm sensor connections
   - Choose recording profile
   - Start button

2. **Recording Screen**
   - Current data screen layout
   - Lap button overlay
   - Pause/Resume controls
   - Elapsed time indicator

3. **Paused Screen**
   - Resume, Save, or Discard options
   - Current ride summary
   - Map with recorded track

4. **Post-Ride Summary**
   - Ride statistics
   - Map with elevation coloring
   - Power/HR/Speed charts
   - Lap splits table
   - Save & Upload options

---

## Phase 3: Third-Party Integrations

Connect Peloton with popular cycling platforms for seamless data sync.

### Strava Integration

| Feature | Description | Priority |
|---------|-------------|----------|
| OAuth Authentication | Connect Strava account | High |
| Activity Upload | Push completed rides to Strava | High |
| Route Import | Pull saved routes from Strava | High |
| Segment Sync | Download starred segments | Medium |
| Live Activity | Real-time activity sharing | Medium |
| Historical Import | Import past activities | Low |
| Segment Matching | Show segment times during ride | Low |

**Strava API Endpoints:**
- `POST /oauth/token` - Authentication
- `POST /uploads` - Activity upload
- `GET /athlete/activities` - Historical activities
- `GET /routes/{id}` - Route details
- `GET /segments/starred` - Starred segments

### Garmin Connect Integration

| Feature | Description | Priority |
|---------|-------------|----------|
| OAuth Authentication | Connect Garmin account | High |
| Activity Upload | Push rides via Garmin Connect API | High |
| Weight Sync | Pull weight from Garmin scales | Medium |
| Training Status | Sync training load data | Medium |
| Course Download | Import Garmin courses | Medium |
| Device Sync | Two-way sync with Garmin devices | Low |

**Garmin API Notes:**
- Requires Garmin Developer Program membership
- Uses OAuth 1.0a (legacy) or OAuth 2.0
- FIT file format preferred for uploads
- Rate limits apply (varies by endpoint)

### RideWithGPS Integration

| Feature | Description | Priority |
|---------|-------------|----------|
| OAuth Authentication | Connect RWGPS account | High |
| Route Import | Pull routes from RWGPS library | High |
| Route Export | Push created routes to RWGPS | Medium |
| Ride Upload | Sync completed rides | Medium |
| Club Routes | Access club/team routes | Low |

**RideWithGPS API Endpoints:**
- `GET /users/current.json` - Current user
- `GET /routes.json` - User's routes
- `GET /routes/{id}.json` - Route details
- `POST /trips.json` - Upload ride

### Integration Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Peloton Backend                          │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Integration Service                      │    │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────────────────┐  │    │
│  │  │ Strava  │  │ Garmin  │  │    RideWithGPS      │  │    │
│  │  │ Client  │  │ Client  │  │       Client        │  │    │
│  │  └────┬────┘  └────┬────┘  └──────────┬──────────┘  │    │
│  └───────┼────────────┼──────────────────┼─────────────┘    │
│          │            │                  │                   │
│  ┌───────┴────────────┴──────────────────┴─────────────┐    │
│  │              OAuth Token Store                        │    │
│  │         (encrypted, per-user tokens)                  │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
           │            │                  │
           ▼            ▼                  ▼
    ┌──────────┐  ┌──────────┐     ┌──────────────┐
    │  Strava  │  │  Garmin  │     │  RideWithGPS │
    │   API    │  │   API    │     │     API      │
    └──────────┘  └──────────┘     └──────────────┘
```

### Database Schema for Integrations

```sql
integration_connections
├── id               UUID PRIMARY KEY
├── user_id          UUID REFERENCES auth.users
├── provider         TEXT ('strava' | 'garmin' | 'ridewithgps')
├── access_token     TEXT (encrypted)
├── refresh_token    TEXT (encrypted)
├── token_expires_at TIMESTAMP
├── athlete_id       TEXT (provider's user ID)
├── scope            TEXT[]
├── connected_at     TIMESTAMP
└── last_sync_at     TIMESTAMP

sync_history
├── id               UUID PRIMARY KEY
├── user_id          UUID REFERENCES auth.users
├── provider         TEXT
├── sync_type        TEXT ('upload' | 'download' | 'full')
├── entity_type      TEXT ('activity' | 'route' | 'weight')
├── entity_id        UUID
├── provider_id      TEXT
├── status           TEXT ('pending' | 'success' | 'failed')
├── error_message    TEXT
└── synced_at        TIMESTAMP
```

---

## Phase 4: Service Course (Bike Management)

Store bike configurations for accurate gear ratios, component tracking, and service reminders.

### Bike Profile Features

| Feature | Description | Priority |
|---------|-------------|----------|
| Multiple Bikes | Store unlimited bike profiles | High |
| Drivetrain Config | Chainring/cassette teeth for gear ratios | High |
| Wheel Size | Accurate speed calculation from sensors | High |
| GeometryGeeks Import | Auto-fill bike specs from geometrygeeks.bike | High |
| Tire Pressure Calculator | Optimal pressure based on weight/width/terrain | High |
| Zinn Fit Import | Upload .zinn files for body measurements | High |
| Fit Calculation | Calculate setup from Zinn + geometry | High |
| Component Tracking | Track parts with install dates | Medium |
| Service Reminders | Distance/time-based maintenance alerts | Medium |
| Bike Weight | For climbing calculations | Medium |
| Default Bike | Auto-select bike for rides | Medium |
| BRR Tire Data | Import rolling resistance data | Medium |
| Multi-Bike Fit | Apply measurements across bikes | Medium |
| Cleat Position | Shoe/cleat setup recommendations | Medium |
| Bike Photos | Visual identification | Low |
| Export Fit Sheet | PDF with all fit measurements | Low |

### Drivetrain Configuration

```typescript
interface Drivetrain {
  type: '1x' | '2x' | '3x';

  // Chainrings (front)
  chainrings: number[];  // e.g., [50, 34] for compact

  // Cassette (rear)
  cassette: number[];    // e.g., [11, 12, 13, 14, 15, 17, 19, 21, 24, 28]

  // Electronic shifting (optional)
  electronicShifting?: {
    type: 'sram_axs' | 'shimano_di2' | 'campagnolo_eps';
    batteryCapacity: number;
  };
}

interface GearRatio {
  chainring: number;
  cog: number;
  ratio: number;           // chainring / cog
  development: number;     // meters per crank revolution
  gearInches: number;      // traditional gear inch measurement
}
```

### Component Tracking

```typescript
interface BikeComponent {
  id: string;
  bikeId: string;
  type: ComponentType;
  brand: string;
  model: string;
  installedAt: Date;
  installedDistanceKm: number;
  expectedLifespanKm?: number;
  notes?: string;
  retired: boolean;
  retiredAt?: Date;
  retiredReason?: string;
}

type ComponentType =
  | 'chain'
  | 'cassette'
  | 'chainring'
  | 'brake_pads'
  | 'tires'
  | 'tubes'
  | 'cables'
  | 'bar_tape'
  | 'bottom_bracket'
  | 'headset'
  | 'wheel_front'
  | 'wheel_rear'
  | 'pedals'
  | 'saddle'
  | 'seatpost'
  | 'handlebars'
  | 'stem'
  | 'other';
```

### Service Reminders

```typescript
interface ServiceReminder {
  id: string;
  bikeId: string;
  componentType: ComponentType;
  reminderType: 'distance' | 'time' | 'both';
  distanceIntervalKm?: number;
  timeIntervalDays?: number;
  lastServicedAt: Date;
  lastServicedDistanceKm: number;
  nextDueAt?: Date;
  nextDueDistanceKm?: number;
  isOverdue: boolean;
}
```

### Database Schema

```sql
bikes
├── id               UUID PRIMARY KEY
├── user_id          UUID REFERENCES auth.users
├── name             TEXT (e.g., "Canyon Aeroad")
├── type             TEXT ('road' | 'mtb' | 'gravel' | 'tt' | 'track' | 'cx')
├── brand            TEXT
├── model            TEXT
├── year             INTEGER
├── weight_kg        DECIMAL
├── wheel_circumference_mm INTEGER (default 2105 for 700x25c)
├── is_default       BOOLEAN
├── photo_url        TEXT
├── notes            TEXT
├── created_at       TIMESTAMP
└── updated_at       TIMESTAMP

bike_drivetrains
├── id               UUID PRIMARY KEY
├── bike_id          UUID REFERENCES bikes
├── type             TEXT ('1x' | '2x' | '3x')
├── chainrings       INTEGER[] (e.g., '{50, 34}')
├── cassette         INTEGER[] (e.g., '{11,12,13,14,15,17,19,21,24,28}')
├── electronic_type  TEXT ('sram_axs' | 'shimano_di2' | 'campagnolo_eps')
└── updated_at       TIMESTAMP

bike_components
├── id               UUID PRIMARY KEY
├── bike_id          UUID REFERENCES bikes
├── type             TEXT
├── brand            TEXT
├── model            TEXT
├── installed_at     DATE
├── installed_km     DECIMAL
├── expected_lifespan_km INTEGER
├── notes            TEXT
├── retired          BOOLEAN DEFAULT false
├── retired_at       DATE
└── retired_reason   TEXT

service_reminders
├── id               UUID PRIMARY KEY
├── bike_id          UUID REFERENCES bikes
├── component_type   TEXT
├── interval_km      INTEGER
├── interval_days    INTEGER
├── last_serviced_at DATE
├── last_serviced_km DECIMAL
└── enabled          BOOLEAN DEFAULT true

ride_bikes (junction for ride-to-bike association)
├── ride_id          UUID REFERENCES rides
├── bike_id          UUID REFERENCES bikes
└── PRIMARY KEY (ride_id, bike_id)
```

### Gear Display Widget

With drivetrain configuration, the gear widget can show:

- Current gear ratio (e.g., "50x17")
- Gear development (meters per revolution)
- Virtual gear position (1-22 for 2x11)
- Gear recommendation for target cadence

### Tire Pressure Calculator

Intelligent tire pressure recommendations based on rider weight, tire width, terrain, and rolling resistance data.

| Feature | Description | Priority |
|---------|-------------|----------|
| Pressure Calculator | Calculate optimal pressure for conditions | High |
| BRR Integration | Import tire data from BicycleRollingResistance.com | High |
| Tire Library | Database of tire models with characteristics | High |
| Multi-Surface Presets | Road, gravel, MTB, wet conditions | Medium |
| Tubeless Adjustments | Lower pressure recommendations for tubeless | Medium |
| Rim Width Factor | Account for internal rim width | Medium |
| Front/Rear Split | Different pressures for weight distribution | Medium |
| Save Configurations | Store tire setups per bike | Low |

**Data Sources:**

- [BicycleRollingResistance.com](https://www.bicyclerollingresistance.com/) - Rolling resistance, puncture protection, weight data
- SILCA pressure calculator formulas
- Manufacturer recommended ranges

```typescript
interface TireModel {
  id: string;
  brand: string;
  model: string;
  width: number;                    // mm (e.g., 25, 28, 32, 40)
  type: 'clincher' | 'tubeless' | 'tubular';
  category: 'road' | 'gravel' | 'mtb' | 'cx' | 'touring';

  // From BicycleRollingResistance.com
  rollingResistance?: number;       // watts at 29km/h, 42.5kg load
  punctureResistance?: number;      // 1-5 scale
  weight?: number;                  // grams
  treadCompound?: string;
  tpi?: number;

  // Pressure ranges
  minPressurePsi: number;
  maxPressurePsi: number;
  recommendedPsiAt75kg?: number;
}

interface PressureCalculation {
  frontPsi: number;
  rearPsi: number;
  frontBar: number;
  rearBar: number;

  // Inputs used
  riderWeightKg: number;
  bikeWeightKg: number;
  tireWidthMm: number;
  rimInternalWidthMm: number;
  terrain: 'smooth_road' | 'rough_road' | 'gravel' | 'mtb';
  tubeless: boolean;
  wetConditions: boolean;

  // Recommendations
  notes: string[];
  rollingResistanceEstimate?: number;  // watts
  comfortScore?: number;               // 1-10
}

interface TirePressureConfig {
  id: string;
  bikeId: string;
  name: string;                     // e.g., "Race Setup", "Wet Weather"
  frontTireId: string;
  rearTireId: string;
  frontPsi: number;
  rearPsi: number;
  rimWidthMm: number;
  terrain: string;
  notes?: string;
}

// Pressure calculation formula (SILCA-inspired)
function calculatePressure(params: {
  totalWeightKg: number;
  tireWidthMm: number;
  rimWidthMm: number;
  weightDistribution: number;       // 0.4 = 40% front, 60% rear typical
  terrain: string;
  tubeless: boolean;
}): { frontPsi: number; rearPsi: number } {
  // Base pressure from weight and tire volume
  const frontLoad = params.totalWeightKg * params.weightDistribution;
  const rearLoad = params.totalWeightKg * (1 - params.weightDistribution);

  // Tire volume approximation
  const tireVolume = Math.PI * Math.pow(params.tireWidthMm / 2, 2);

  // Base PSI calculation
  let frontPsi = (frontLoad / tireVolume) * 1000 + 20;
  let rearPsi = (rearLoad / tireVolume) * 1000 + 20;

  // Terrain adjustments
  const terrainFactors: Record<string, number> = {
    'smooth_road': 1.0,
    'rough_road': 0.95,
    'gravel': 0.85,
    'mtb': 0.70,
  };
  const factor = terrainFactors[params.terrain] || 1.0;

  frontPsi *= factor;
  rearPsi *= factor;

  // Tubeless bonus (can run ~10% lower)
  if (params.tubeless) {
    frontPsi *= 0.9;
    rearPsi *= 0.9;
  }

  return {
    frontPsi: Math.round(frontPsi * 10) / 10,
    rearPsi: Math.round(rearPsi * 10) / 10,
  };
}
```

**Database Schema Additions:**

```sql
tire_models
├── id                   UUID PRIMARY KEY
├── brand                TEXT
├── model                TEXT
├── width_mm             INTEGER
├── type                 TEXT ('clincher' | 'tubeless' | 'tubular')
├── category             TEXT ('road' | 'gravel' | 'mtb' | 'cx')
├── rolling_resistance   DECIMAL
├── puncture_resistance  INTEGER
├── weight_grams         INTEGER
├── tpi                  INTEGER
├── min_pressure_psi     DECIMAL
├── max_pressure_psi     DECIMAL
├── brr_url              TEXT (source link)
├── updated_at           TIMESTAMP
└── UNIQUE(brand, model, width_mm)

tire_pressure_configs
├── id                   UUID PRIMARY KEY
├── bike_id              UUID REFERENCES bikes
├── name                 TEXT
├── front_tire_id        UUID REFERENCES tire_models
├── rear_tire_id         UUID REFERENCES tire_models
├── front_psi            DECIMAL
├── rear_psi             DECIMAL
├── rim_width_mm         INTEGER
├── terrain              TEXT
├── is_default           BOOLEAN DEFAULT false
├── notes                TEXT
└── created_at           TIMESTAMP
```

### Geometry Geeks Integration

Import complete bike geometry data from [GeometryGeeks.bike](https://geometrygeeks.bike/) for accurate fit calculations and bike comparisons.

| Feature | Description | Priority |
|---------|-------------|----------|
| Bike Search | Search GeometryGeeks database | High |
| Auto-Import | Import full geometry specs | High |
| Size Selection | Choose frame size | High |
| Geometry Display | Visual geometry diagram | Medium |
| Fit Calculator | Stack/reach based position | Medium |
| Bike Comparison | Compare geometries side-by-side | Medium |
| Manual Override | Edit imported values | Low |

**GeometryGeeks Data Points:**

```typescript
interface BikeGeometry {
  // Frame identification
  brand: string;
  model: string;
  year: number;
  size: string;                     // e.g., "54", "M", "56cm"
  geometryGeeksUrl?: string;

  // Primary fit numbers
  stackMm: number;
  reachMm: number;

  // Frame geometry
  seatTubeLengthMm: number;         // center-to-top
  seatTubeAngle: number;            // degrees
  effectiveTopTubeMm: number;
  headTubeAngle: number;            // degrees
  headTubeLengthMm: number;

  // Fork & front end
  forkRakeMm: number;
  forkAxleToCrownMm: number;
  trailMm: number;

  // Rear triangle
  chainstayLengthMm: number;
  wheelbaseMm: number;
  bbDropMm: number;
  bbHeightMm: number;

  // Standover & clearance
  standoverHeightMm?: number;

  // Cockpit (if specified)
  stemLengthMm?: number;
  handlebarWidthMm?: number;
  crankLengthMm?: number;

  // Calculated values
  frontCenterMm?: number;
  seatTubeAngleEffective?: number;
}

interface GeometryComparison {
  bikes: BikeGeometry[];
  differences: {
    field: keyof BikeGeometry;
    values: number[];
    maxDelta: number;
    unit: string;
  }[];
  fitRecommendation?: string;
}
```

**Integration Flow:**

```text
┌─────────────────────────────────────────────────────────────┐
│                    Add New Bike Flow                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. User enters bike brand/model                             │
│           │                                                  │
│           ▼                                                  │
│  2. Search GeometryGeeks API/scraper                        │
│           │                                                  │
│           ▼                                                  │
│  ┌─────────────────────────────────────────────┐            │
│  │ Search Results:                              │            │
│  │ • Canyon Aeroad CF SLX (2023)               │            │
│  │ • Canyon Aeroad CF SL (2023)                │            │
│  │ • Canyon Aeroad CFR (2024)                  │            │
│  └─────────────────────────────────────────────┘            │
│           │                                                  │
│           ▼                                                  │
│  3. User selects bike, chooses size                         │
│           │                                                  │
│           ▼                                                  │
│  ┌─────────────────────────────────────────────┐            │
│  │ Imported Geometry:                           │            │
│  │ Stack: 537mm    Reach: 390mm                │            │
│  │ Head Angle: 73.5°   Seat Angle: 73.0°       │            │
│  │ Chainstay: 410mm    Wheelbase: 995mm        │            │
│  │ [Edit] [Confirm]                            │            │
│  └─────────────────────────────────────────────┘            │
│           │                                                  │
│           ▼                                                  │
│  4. Bike created with full geometry data                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Database Schema Additions:**

```sql
-- Extend bikes table with geometry
ALTER TABLE bikes ADD COLUMN geometry JSONB;
ALTER TABLE bikes ADD COLUMN geometry_geeks_url TEXT;
ALTER TABLE bikes ADD COLUMN frame_size TEXT;

-- Or separate geometry table for history/comparison
bike_geometries
├── id                   UUID PRIMARY KEY
├── bike_id              UUID REFERENCES bikes
├── source               TEXT ('geometry_geeks' | 'manual')
├── source_url           TEXT
├── frame_size           TEXT
├── stack_mm             DECIMAL
├── reach_mm             DECIMAL
├── seat_tube_length_mm  DECIMAL
├── seat_tube_angle      DECIMAL
├── effective_top_tube_mm DECIMAL
├── head_tube_angle      DECIMAL
├── head_tube_length_mm  DECIMAL
├── fork_rake_mm         DECIMAL
├── trail_mm             DECIMAL
├── chainstay_length_mm  DECIMAL
├── wheelbase_mm         DECIMAL
├── bb_drop_mm           DECIMAL
├── bb_height_mm         DECIMAL
├── standover_height_mm  DECIMAL
├── raw_data             JSONB (full import)
└── imported_at          TIMESTAMP
```

**Fit Calculator:**

Using geometry data, calculate optimal saddle and handlebar positions:

```typescript
interface FitCalculation {
  // Inputs
  inseamMm: number;
  torsoLengthMm: number;
  armLengthMm: number;
  shoulderWidthMm: number;
  flexibility: 'low' | 'medium' | 'high';
  ridingStyle: 'aggressive' | 'moderate' | 'relaxed';

  // Calculated recommendations
  saddleHeightMm: number;           // BB to saddle top
  saddleSetbackMm: number;          // Behind BB
  handlebarDropMm: number;          // Saddle to bars
  handlebarReachMm: number;         // Saddle to bars horizontal
  stemLengthMm: number;
  stemAngle: number;

  // Fit quality
  stackReachRatio: number;          // Compare to ideal for style
  kneOverPedalPosition: string;
  backAngle: number;
}
```

### Zinn Fit File Import

Import body measurements from Zinn bike fit system and calculate precise bike setup positions when combined with frame geometry.

| Feature | Description | Priority | Status |
|---------|-------------|----------|--------|
| Retül/Zinn File Upload | Parse Retül PDF, .zinn, or exported fit files | High | In Progress |
| Body Measurements | Store inseam, torso, arm, shoulder measurements | High | |
| Fit Calculation | Calculate positions from measurements + geometry | High | In Progress |
| **Visual Bike Fit Diagram** | Interactive SVG showing frame, fit position, and rider silhouette | High | **In Progress** - Basic diagram working, geometry validation and scaling refinements needed |
| Multi-Bike Fit | Apply measurements to different frames | Medium | |
| Fit Comparison | Compare calculated vs current setup visually | Medium |
| Cleat Position | Shoe/cleat setup recommendations | Medium |
| Fit History | Track changes over time | Low |
| Export Fit Sheet | PDF with all measurements, settings, and diagram | Low |

### Visual Bike Fit Diagram

Interactive SVG visualization that displays:
- **Frame geometry** - Accurate representation based on stack, reach, angles
- **Fit position** - Saddle height, handlebar position, stem/spacer setup
- **Rider silhouette** - Optional overlay showing body position on bike
- **Measurements** - Annotated dimensions with highlighting

```typescript
interface BikeFitDiagramProps {
  geometry: {
    stackMm: number;
    reachMm: number;
    seatTubeAngle: number;
    headTubeAngle: number;
    seatTubeLengthMm?: number;
    headTubeLengthMm?: number;
    chainstayLengthMm?: number;
    wheelbaseMm?: number;
  };
  fitPosition?: {
    saddleHeight: number;      // BB to saddle (mm)
    saddleSetback: number;     // Behind BB
    handlebarStack: number;    // BB to handlebar
    handlebarReach: number;    // BB to handlebar
    stemLength?: number;
    stemAngle?: number;
    spacerStack?: number;
  };
  rider?: {
    inseam?: number;
    torsoLength?: number;
    armLength?: number;
    shoulderWidth?: number;
  };
  showMeasurements?: boolean;
  showRider?: boolean;
}
```

**Use Cases:**
- Bike detail page - Show frame with current fit setup
- Bike wizard - Preview fit calculations on new frame
- Fit comparison - Overlay two positions to visualize differences
- Frame selection - Compare how rider fits on different bikes

**Zinn Measurement System:**

The Zinn fit system uses key body measurements to calculate bike positions using proven formulas developed by Lennard Zinn.

```typescript
interface ZinnMeasurements {
  // Source file info
  fileVersion?: string;
  measuredAt?: Date;
  measuredBy?: string;

  // Primary measurements (mm)
  inseam: number;                   // Floor to crotch (bare feet, book method)
  trunkLength: number;              // Saddle surface to sternal notch
  forearmLength: number;            // Elbow to fingertip
  armLength: number;                // Acromion to wrist crease
  thighLength: number;              // Greater trochanter to knee center
  lowerLegLength: number;           // Knee center to floor
  statureHeight: number;            // Total standing height
  shoulderWidth: number;            // Acromion to acromion

  // Foot measurements
  footLength: number;               // Heel to toe
  archLength: number;               // Heel to ball of foot
  cleatedFootLength?: number;       // With cycling shoes

  // Flexibility assessment
  sitAndReach?: number;             // Standard flexibility test (cm)
  flexibility: 'limited' | 'average' | 'good' | 'excellent';

  // Additional factors
  ridingStyle: 'recreational' | 'fitness' | 'performance' | 'racing';
  experienceLevel: 'beginner' | 'intermediate' | 'experienced' | 'elite';
  primaryUse: 'road' | 'gravel' | 'mtb' | 'tt' | 'touring';

  // Physical considerations
  injuries?: string[];
  flexibility_notes?: string;
}

interface ZinnCalculatedFit {
  // Saddle position
  saddleHeightMm: number;           // BB center to saddle top
  saddleHeightMethod: 'inseam' | 'leMond' | 'hamley';
  saddleSetbackMm: number;          // Behind BB vertical
  saddleForeAftMm: number;          // Relative to BB
  saddleTilt: number;               // Degrees from level

  // Handlebar position
  handlebarReachMm: number;         // Saddle nose to bar center
  handlebarDropMm: number;          // Saddle top to bar top
  handlebarWidthMm: number;         // Shoulder-based recommendation

  // Stem
  stemLengthMm: number;             // Center to center
  stemAngle: number;                // Degrees
  spacerStackMm: number;            // Under stem

  // Crank
  crankLengthMm: number;            // Based on inseam/thigh

  // Cleat position
  cleatForeAftMm: number;           // Ball of foot over pedal spindle
  cleatRotation: number;            // Degrees of float used
  cleatLateralMm: number;           // Stance width adjustment

  // Derived angles
  kneeAngleAtBottom: number;        // Degrees (target: 25-35°)
  kneeOverPedalMm: number;          // KOPS measurement
  hipAngle: number;                 // Torso/thigh angle
  backAngle: number;                // From horizontal
  shoulderAngle: number;            // Arm angle at shoulder

  // Confidence & notes
  confidenceScore: number;          // 0-100 based on measurement quality
  warnings: string[];               // Potential issues
  recommendations: string[];        // Suggested adjustments
}

// Zinn calculation formulas
const ZINN_FORMULAS = {
  // LeMond formula: inseam × 0.883 = saddle height
  saddleHeight_leMond: (inseam: number) => inseam * 0.883,

  // Hamley formula: inseam × 1.09 = saddle height from pedal
  saddleHeight_hamley: (inseam: number) => inseam * 1.09,

  // Trunk + arm method for reach
  reach: (trunk: number, arm: number, flexibility: string) => {
    const base = (trunk + arm) * 0.47;
    const flexFactor = {
      'limited': 0.94,
      'average': 1.0,
      'good': 1.03,
      'excellent': 1.06,
    }[flexibility] || 1.0;
    return base * flexFactor;
  },

  // Handlebar width from shoulder width
  handlebarWidth: (shoulder: number, style: string) => {
    const styleOffset = {
      'recreational': 20,
      'fitness': 10,
      'performance': 0,
      'racing': -10,
    }[style] || 0;
    return shoulder + styleOffset;
  },

  // Crank length from inseam
  crankLength: (inseam: number) => {
    if (inseam < 740) return 165;
    if (inseam < 810) return 170;
    if (inseam < 860) return 172.5;
    return 175;
  },

  // Saddle setback from thigh length
  saddleSetback: (thigh: number) => thigh * 0.12,

  // Knee angle at bottom of pedal stroke (target 25-35°)
  kneeAngle: (inseam: number, saddleHeight: number, crankLength: number) => {
    const legExtension = saddleHeight + crankLength;
    const ratio = legExtension / inseam;
    // Approximate angle from extension ratio
    return Math.acos(ratio - 1) * (180 / Math.PI);
  },
};
```

**Fit Calculation with Frame Geometry:**

When Zinn measurements are combined with bike geometry, calculate exact component positions:

```typescript
interface BikeSetupCalculation {
  // Input sources
  zinnFit: ZinnCalculatedFit;
  geometry: BikeGeometry;

  // Calculated setup
  setup: {
    // Seatpost
    seatpostExtensionMm: number;    // Exposed seatpost
    seatpostInsertionMm: number;    // Inside frame (check min insertion)
    saddleRailPositionMm: number;   // Fore/aft on rails

    // Stem & spacers
    stemLengthMm: number;
    stemAngle: number;
    spacersBelowStemMm: number;
    spacersAboveStemMm: number;     // For future adjustment room
    headsetCapSpacerMm: number;

    // Handlebar
    handlebarModel?: string;         // Recommended width
    hoodPositionMm: number;         // From bar center

    // Fit achieved
    actualStackMm: number;          // With stem/spacers
    actualReachMm: number;          // With stem length
    saddleToBarDropMm: number;
    saddleToBarReachMm: number;
  };

  // Compatibility check
  compatibility: {
    seatpostLengthOk: boolean;      // Enough post for height
    minInsertionOk: boolean;        // Safe insertion depth
    stemRangeOk: boolean;           // Achievable with available stems
    spacerHeightOk: boolean;        // Within steerer length
    warnings: string[];
  };
}

function calculateBikeSetup(
  zinn: ZinnMeasurements,
  geometry: BikeGeometry
): BikeSetupCalculation {
  // Calculate ideal fit from Zinn
  const idealFit = calculateZinnFit(zinn);

  // Calculate seatpost extension
  const seatpostExtension = idealFit.saddleHeightMm - geometry.seatTubeLengthMm;

  // Calculate required stack with spacers
  const targetBarHeight = idealFit.saddleHeightMm - idealFit.handlebarDropMm;
  const frameStack = geometry.stackMm;
  const spacersNeeded = targetBarHeight - frameStack - 40; // 40mm avg stem rise

  // Calculate stem length for reach
  const targetReach = idealFit.handlebarReachMm;
  const frameReach = geometry.reachMm;
  const stemLength = targetReach - frameReach + 50; // Account for bar reach

  return {
    zinnFit: idealFit,
    geometry,
    setup: {
      seatpostExtensionMm: Math.round(seatpostExtension),
      seatpostInsertionMm: Math.round(geometry.seatTubeLengthMm * 0.15), // Min 15%
      saddleRailPositionMm: Math.round(idealFit.saddleForeAftMm),
      stemLengthMm: Math.round(stemLength / 10) * 10, // Round to 10mm
      stemAngle: idealFit.handlebarDropMm > 100 ? -17 : -6,
      spacersBelowStemMm: Math.max(0, Math.round(spacersNeeded)),
      spacersAboveStemMm: 10,
      headsetCapSpacerMm: 5,
      handlebarModel: `${idealFit.handlebarWidthMm}mm`,
      hoodPositionMm: 80,
      actualStackMm: frameStack + spacersNeeded + 40,
      actualReachMm: frameReach + stemLength - 50,
      saddleToBarDropMm: idealFit.handlebarDropMm,
      saddleToBarReachMm: idealFit.handlebarReachMm,
    },
    compatibility: {
      seatpostLengthOk: seatpostExtension > 50 && seatpostExtension < 300,
      minInsertionOk: seatpostExtension < geometry.seatTubeLengthMm * 0.7,
      stemRangeOk: stemLength >= 60 && stemLength <= 140,
      spacerHeightOk: spacersNeeded >= 0 && spacersNeeded <= 50,
      warnings: [],
    },
  };
}
```

**Database Schema Additions:**

```sql
zinn_measurements
├── id                   UUID PRIMARY KEY
├── user_id              UUID REFERENCES auth.users
├── name                 TEXT (e.g., "2024 Fit Session")
├── measured_at          DATE
├── measured_by          TEXT
├── file_source          TEXT (original filename)
├── inseam_mm            INTEGER
├── trunk_length_mm      INTEGER
├── forearm_length_mm    INTEGER
├── arm_length_mm        INTEGER
├── thigh_length_mm      INTEGER
├── lower_leg_length_mm  INTEGER
├── stature_height_mm    INTEGER
├── shoulder_width_mm    INTEGER
├── foot_length_mm       INTEGER
├── arch_length_mm       INTEGER
├── flexibility          TEXT
├── riding_style         TEXT
├── experience_level     TEXT
├── primary_use          TEXT
├── raw_data             JSONB (full import)
├── notes                TEXT
└── created_at           TIMESTAMP

bike_fit_calculations
├── id                   UUID PRIMARY KEY
├── user_id              UUID REFERENCES auth.users
├── bike_id              UUID REFERENCES bikes
├── zinn_measurement_id  UUID REFERENCES zinn_measurements
├── calculated_at        TIMESTAMP
├── saddle_height_mm     DECIMAL
├── saddle_setback_mm    DECIMAL
├── handlebar_reach_mm   DECIMAL
├── handlebar_drop_mm    DECIMAL
├── stem_length_mm       INTEGER
├── stem_angle           DECIMAL
├── spacer_stack_mm      INTEGER
├── crank_length_mm      DECIMAL
├── handlebar_width_mm   INTEGER
├── cleat_position       JSONB
├── knee_angle           DECIMAL
├── back_angle           DECIMAL
├── confidence_score     INTEGER
├── warnings             TEXT[]
├── recommendations      TEXT[]
├── is_current           BOOLEAN DEFAULT true
└── notes                TEXT

-- Track actual vs calculated for refinement
fit_adjustments
├── id                   UUID PRIMARY KEY
├── fit_calculation_id   UUID REFERENCES bike_fit_calculations
├── adjustment_type      TEXT ('saddle_height' | 'reach' | 'drop' | etc)
├── calculated_value     DECIMAL
├── actual_value         DECIMAL
├── reason               TEXT
├── adjusted_at          TIMESTAMP
└── notes                TEXT
```

**Zinn File Parser:**

```typescript
// Support common Zinn export formats
interface ZinnFileParser {
  parseFile(file: File): Promise<ZinnMeasurements>;
  supportedFormats: string[];
}

const zinnParser: ZinnFileParser = {
  supportedFormats: ['.zinn', '.csv', '.json', '.xml'],

  async parseFile(file: File): Promise<ZinnMeasurements> {
    const ext = file.name.split('.').pop()?.toLowerCase();
    const content = await file.text();

    switch (ext) {
      case 'zinn':
        return parseZinnNative(content);
      case 'csv':
        return parseZinnCSV(content);
      case 'json':
        return JSON.parse(content) as ZinnMeasurements;
      case 'xml':
        return parseZinnXML(content);
      default:
        throw new Error(`Unsupported file format: ${ext}`);
    }
  },
};

// Parse native Zinn format (key=value pairs)
function parseZinnNative(content: string): ZinnMeasurements {
  const lines = content.split('\n');
  const data: Record<string, string> = {};

  for (const line of lines) {
    const [key, value] = line.split('=').map(s => s.trim());
    if (key && value) {
      data[key] = value;
    }
  }

  return {
    inseam: parseInt(data['inseam_mm'] || data['inseam']),
    trunkLength: parseInt(data['trunk_length_mm'] || data['trunk']),
    forearmLength: parseInt(data['forearm_length_mm'] || data['forearm']),
    armLength: parseInt(data['arm_length_mm'] || data['arm']),
    thighLength: parseInt(data['thigh_length_mm'] || data['thigh']),
    lowerLegLength: parseInt(data['lower_leg_length_mm'] || data['lower_leg']),
    statureHeight: parseInt(data['stature_mm'] || data['height']),
    shoulderWidth: parseInt(data['shoulder_width_mm'] || data['shoulder']),
    footLength: parseInt(data['foot_length_mm'] || data['foot']),
    archLength: parseInt(data['arch_length_mm'] || data['arch']),
    flexibility: (data['flexibility'] as ZinnMeasurements['flexibility']) || 'average',
    ridingStyle: (data['riding_style'] as ZinnMeasurements['ridingStyle']) || 'fitness',
    experienceLevel: (data['experience'] as ZinnMeasurements['experienceLevel']) || 'intermediate',
    primaryUse: (data['primary_use'] as ZinnMeasurements['primaryUse']) || 'road',
    measuredAt: data['date'] ? new Date(data['date']) : undefined,
    measuredBy: data['fitter'] || data['measured_by'],
  };
}
```

**Fit Workflow:**

```text
┌─────────────────────────────────────────────────────────────────────┐
│                     Zinn Fit Integration Flow                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. Upload Zinn File                                                │
│     ┌────────────────────────────────────────────┐                  │
│     │  📄 Drop .zinn file or enter measurements   │                  │
│     │     [Upload File]  [Enter Manually]         │                  │
│     └────────────────────────────────────────────┘                  │
│                          │                                           │
│                          ▼                                           │
│  2. Review Measurements                                             │
│     ┌────────────────────────────────────────────┐                  │
│     │  Inseam: 860mm      Trunk: 620mm           │                  │
│     │  Arm: 640mm         Shoulder: 420mm        │                  │
│     │  Flexibility: Good   Style: Performance    │                  │
│     │  [Edit] [Confirm]                          │                  │
│     └────────────────────────────────────────────┘                  │
│                          │                                           │
│                          ▼                                           │
│  3. Select Bike (with geometry)                                     │
│     ┌────────────────────────────────────────────┐                  │
│     │  🚴 Canyon Aeroad CF SLX - Size 56         │                  │
│     │     Stack: 545mm  Reach: 395mm             │                  │
│     │  🚴 Specialized Tarmac SL7 - Size 54       │                  │
│     │     Stack: 527mm  Reach: 382mm             │                  │
│     └────────────────────────────────────────────┘                  │
│                          │                                           │
│                          ▼                                           │
│  4. View Calculated Setup                                           │
│     ┌────────────────────────────────────────────┐                  │
│     │  SADDLE                                     │                  │
│     │  Height: 759mm (from BB)                   │                  │
│     │  Setback: 52mm   Tilt: 0°                  │                  │
│     │                                             │                  │
│     │  COCKPIT                                    │                  │
│     │  Stem: 110mm / -6°                         │                  │
│     │  Spacers: 15mm                             │                  │
│     │  Drop: 85mm   Reach: 520mm                 │                  │
│     │                                             │                  │
│     │  CRANKS: 172.5mm                           │                  │
│     │  BARS: 420mm                               │                  │
│     │                                             │
│     │  ⚠️ Stem length at upper range             │                  │
│     │  💡 Consider size 54 for more reach        │                  │
│     │                                             │                  │
│     │  [Save to Bike] [Compare Sizes] [Export]   │                  │
│     └────────────────────────────────────────────┘                  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Phase 5: Training Platform (TrainingPeaks-like Features)

Transform Peloton into a complete training management platform.

### Training Calendar

| Feature | Description | Priority |
|---------|-------------|----------|
| Calendar View | Weekly/monthly training overview | High |
| Planned Workouts | Schedule future workouts | High |
| Workout Library | Pre-built and custom workouts | High |
| Compliance Tracking | Planned vs. actual comparison | High |
| Training Plans | Multi-week structured plans | Medium |
| Drag & Drop | Move workouts between days | Medium |
| Recurring Workouts | Weekly repeating sessions | Medium |
| Rest Day Suggestions | AI-based recovery recommendations | Low |

### Workout Builder

```typescript
interface Workout {
  id: string;
  userId: string;
  name: string;
  description: string;
  type: WorkoutType;
  targetTSS: number;
  targetDuration: number;  // minutes
  targetIF: number;
  intervals: WorkoutInterval[];
  tags: string[];
  isPublic: boolean;
}

type WorkoutType =
  | 'endurance'
  | 'tempo'
  | 'sweet_spot'
  | 'threshold'
  | 'vo2max'
  | 'anaerobic'
  | 'sprint'
  | 'recovery'
  | 'race'
  | 'group_ride'
  | 'custom';

interface WorkoutInterval {
  id: string;
  name: string;
  duration: number;           // seconds, or 0 for distance-based
  distance?: number;          // meters, for distance-based intervals
  targetType: 'power' | 'hr' | 'pace' | 'rpe' | 'free';
  targetValue?: number;       // watts, bpm, or RPE
  targetRangeLow?: number;    // for zone-based targets
  targetRangeHigh?: number;
  cadenceTarget?: number;
  cadenceRange?: [number, number];
  repeat?: number;            // for repeat sets
  restInterval?: WorkoutInterval;  // rest between repeats
}
```

### Performance Management Chart (PMC)

```typescript
interface PerformanceMetrics {
  date: Date;

  // Training Load
  tss: number;                    // Training Stress Score
  ctl: number;                    // Chronic Training Load (fitness)
  atl: number;                    // Acute Training Load (fatigue)
  tsb: number;                    // Training Stress Balance (form)

  // Ramp Rate
  ctlRampRate: number;            // Weekly CTL change

  // Performance Markers
  ftp: number;                    // Current FTP
  ftpConfidence: number;          // Confidence in FTP estimate

  // Workout Summary
  workoutCount: number;
  totalDuration: number;
  totalDistance: number;
  totalElevation: number;
}
```

### Training Zones Configuration

```typescript
interface TrainingZones {
  userId: string;

  powerZones: {
    type: 'coggan' | 'polarized' | 'custom';
    ftp: number;
    zones: Zone[];
  };

  heartRateZones: {
    type: 'lthr' | 'max_hr' | 'hrr' | 'custom';
    lthr?: number;
    maxHr?: number;
    restingHr?: number;
    zones: Zone[];
  };

  paceZones?: {
    type: 'threshold' | 'custom';
    thresholdPace: number;  // min/km
    zones: Zone[];
  };
}

interface Zone {
  number: number;
  name: string;
  description: string;
  color: string;
  minPercent: number;
  maxPercent: number;
  minValue?: number;      // Calculated absolute value
  maxValue?: number;
}

// Coggan Power Zones (default)
const COGGAN_ZONES: Zone[] = [
  { number: 1, name: 'Active Recovery', minPercent: 0, maxPercent: 55, color: '#808080' },
  { number: 2, name: 'Endurance', minPercent: 55, maxPercent: 75, color: '#0000FF' },
  { number: 3, name: 'Tempo', minPercent: 75, maxPercent: 90, color: '#00FF00' },
  { number: 4, name: 'Threshold', minPercent: 90, maxPercent: 105, color: '#FFFF00' },
  { number: 5, name: 'VO2max', minPercent: 105, maxPercent: 120, color: '#FFA500' },
  { number: 6, name: 'Anaerobic', minPercent: 120, maxPercent: 150, color: '#FF0000' },
  { number: 7, name: 'Neuromuscular', minPercent: 150, maxPercent: Infinity, color: '#800080' },
];
```

### Workout Execution (Mobile App)

During a structured workout, the mobile app provides:

1. **Workout Mode Screen**
   - Current interval name and description
   - Target power/HR zone with visual indicator
   - Time remaining in interval
   - Next interval preview
   - Compliance indicator (in zone / above / below)

2. **Audio Cues**
   - Interval start/end announcements
   - Target zone reminders
   - Encouragement for long intervals

3. **Adaptive Adjustments**
   - Auto-adjust targets based on fatigue
   - Suggest workout modifications
   - Early termination recommendations

### Training Plan Templates

```typescript
interface TrainingPlan {
  id: string;
  name: string;
  description: string;
  author: string;
  durationWeeks: number;
  targetEvent?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'elite';
  weeklyHours: { min: number; max: number };
  weeks: PlanWeek[];
  tags: string[];
}

interface PlanWeek {
  weekNumber: number;
  name: string;
  description: string;
  phase: 'base' | 'build' | 'peak' | 'taper' | 'recovery';
  targetTSS: number;
  targetHours: number;
  workouts: PlannedWorkout[];
}

interface PlannedWorkout {
  dayOfWeek: number;  // 0-6 (Sunday-Saturday)
  workoutId: string;
  isKeyWorkout: boolean;
  notes?: string;
  alternatives?: string[];  // Alternative workout IDs
}
```

### Database Schema for Training

```sql
workouts
├── id               UUID PRIMARY KEY
├── user_id          UUID REFERENCES auth.users (null for public library)
├── name             TEXT
├── description      TEXT
├── type             TEXT
├── target_tss       INTEGER
├── target_duration  INTEGER (minutes)
├── target_if        DECIMAL
├── intervals        JSONB
├── tags             TEXT[]
├── is_public        BOOLEAN DEFAULT false
├── source           TEXT ('user' | 'library' | 'coach')
└── created_at       TIMESTAMP

training_plans
├── id               UUID PRIMARY KEY
├── author_id        UUID REFERENCES auth.users
├── name             TEXT
├── description      TEXT
├── duration_weeks   INTEGER
├── target_event     TEXT
├── difficulty       TEXT
├── weekly_hours_min DECIMAL
├── weekly_hours_max DECIMAL
├── weeks            JSONB
├── tags             TEXT[]
├── is_public        BOOLEAN DEFAULT false
└── created_at       TIMESTAMP

calendar_entries
├── id               UUID PRIMARY KEY
├── user_id          UUID REFERENCES auth.users
├── date             DATE
├── entry_type       TEXT ('planned_workout' | 'completed_ride' | 'note' | 'rest')
├── workout_id       UUID REFERENCES workouts
├── ride_id          UUID REFERENCES rides
├── plan_id          UUID REFERENCES training_plans
├── compliance       DECIMAL (0-100%)
├── notes            TEXT
└── created_at       TIMESTAMP

performance_metrics (daily aggregates)
├── id               UUID PRIMARY KEY
├── user_id          UUID REFERENCES auth.users
├── date             DATE
├── tss              DECIMAL
├── duration_minutes INTEGER
├── distance_km      DECIMAL
├── elevation_m      INTEGER
├── workout_count    INTEGER
├── ctl              DECIMAL (calculated)
├── atl              DECIMAL (calculated)
├── tsb              DECIMAL (calculated)
└── updated_at       TIMESTAMP
```

---

## Implementation Priority Matrix

| Phase | Feature | Impact | Effort | Priority |
|-------|---------|--------|--------|----------|
| 1 | Basic athlete profile | High | Low | **P0** |
| 1 | FTP & zones config | High | Low | **P0** |
| 2 | GPS ride recording | High | Medium | **P0** |
| 2 | Ride summary & export | High | Medium | **P0** |
| 3 | Strava upload | High | Medium | **P1** |
| 4 | Bike profiles | Medium | Low | **P1** |
| 4 | Gear ratio display | Medium | Low | **P1** |
| 4 | GeometryGeeks import | Medium | Medium | **P1** |
| 4 | Zinn fit file import | Medium | Medium | **P1** |
| 4 | Fit calculation (Zinn + geometry) | High | Medium | **P1** |
| 3 | Strava route import | Medium | Medium | **P1** |
| 4 | Tire pressure calculator | Medium | Low | **P1** |
| 4 | BRR tire data import | Medium | Medium | **P2** |
| 3 | Garmin Connect sync | Medium | High | **P2** |
| 3 | RideWithGPS sync | Low | Medium | **P2** |
| 4 | Component tracking | Low | Medium | **P2** |
| 4 | Service reminders | Low | Low | **P2** |
| 4 | Multi-bike fit comparison | Low | Low | **P2** |
| 4 | Cleat position calculator | Low | Medium | **P2** |
| 5 | Training calendar | High | High | **P2** |
| 5 | Workout builder | High | High | **P2** |
| 5 | PMC chart | Medium | Medium | **P2** |
| 5 | Training plans | Medium | High | **P3** |
| 5 | Workout execution mode | Medium | High | **P3** |
| 4 | Export fit sheet (PDF) | Low | Low | **P3** |

---

## Layout Builder (Web App)

The Layout Builder allows users to design custom data screens for the mobile app with a visual drag-and-drop interface.

### Preconfigured Screen Templates

Allow users to quickly get started with professionally designed screen layouts that can be used as-is or customized.

| Feature | Description | Priority | Status |
|---------|-------------|----------|--------|
| Screen Template Library | Collection of pre-built screen layouts for common use cases | High | Planned |
| Template Categories | Organize templates by use case (climbing, racing, training, casual) | High | Planned |
| One-Click Apply | Apply template directly to create a new screen | High | Planned |
| Clone & Edit | Copy template and customize widgets, colors, layout | High | Planned |
| Community Templates | Share and discover user-created layouts | Medium | Planned |
| Import/Export | Share templates as JSON files | Low | Planned |

**Template Categories:**

- **Road Racing** - Focus on power, HR zones, speed, gap times
- **Climbing** - Gradient, elevation, VAM, W/kg
- **Time Trial** - Power targets, lap times, aerodynamic data
- **Endurance/Base** - HR zones, time in zone, TSS
- **Gravel/Adventure** - Navigation focused, battery life, distance to go
- **Group Ride** - Social metrics, easy-read large numbers
- **Training Intervals** - Workout targets, interval timer, compliance
- **Minimal** - Clean, distraction-free essential data only

**Template Structure:**

```typescript
interface ScreenTemplate {
  id: string;
  name: string;
  description: string;
  category: 'racing' | 'climbing' | 'tt' | 'endurance' | 'gravel' | 'group' | 'training' | 'minimal';
  thumbnail: string;          // Preview image URL
  author: string;
  isOfficial: boolean;        // Peloton-provided vs community
  layout: {
    columns: number;
    rows: number;
    widgets: WidgetPlacement[];
  };
  colorScheme?: 'light' | 'dark' | 'high_contrast';
  tags: string[];
  downloadCount?: number;
  rating?: number;
}
```

---

## Phase 0: Mobile App Foundation (Expo)

The mobile app is the core product - a bike computer that runs on iOS and Android. This phase focuses on building a functional mobile app before adding advanced features.

### Core Mobile Features

| Feature | Description | Priority |
|---------|-------------|----------|
| Expo Setup | Configure Expo with proper native modules | **P0** |
| Map Screen | Mapbox map with current location | **P0** |
| Data Screen | Widget grid displaying sensor data | **P0** |
| BLE Sensor Connection | Heart rate, power, speed, cadence | **P0** |
| Basic Ride Recording | GPS tracking with start/pause/stop | **P0** |
| Profile Sync | Download layouts/routes from web | **P0** |
| Offline Support | Cache routes and layouts locally | High |
| Screen Keep-Awake | Prevent screen sleep during rides | High |
| Background Location | Continue tracking when app backgrounded | High |
| Haptic Feedback | Vibration for lap markers, alerts | Medium |
| Voice Announcements | Audio for metrics at intervals | Medium |
| **LiDAR Body Scanning** | Use iOS LiDAR to measure body dimensions for bike fit | Medium |

### Mobile Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | React Native + Expo |
| Navigation | React Navigation (tabs + stack) |
| Maps | Mapbox GL (react-native-mapbox-gl) |
| Bluetooth | react-native-ble-plx |
| Location | expo-location |
| Storage | AsyncStorage + expo-file-system |
| State | Zustand or Redux Toolkit |

### Mobile App Screens

```
├── Auth
│   └── LoginScreen
├── Main Tabs
│   ├── MapScreen (route display + navigation)
│   ├── DataScreen (widget grid)
│   └── SettingsScreen
├── Modals
│   ├── SensorPairingScreen
│   ├── ProfileSelectScreen
│   └── RouteSelectScreen
└── Recording
    ├── PreRideScreen
    ├── ActiveRideScreen (overlays data/map)
    └── RideSummaryScreen
```

### BLE Sensor Services

| Sensor Type | BLE Service UUID | Characteristics |
|-------------|------------------|-----------------|
| Heart Rate | 0x180D | HR Measurement (0x2A37) |
| Cycling Power | 0x1818 | Power Measurement (0x2A63) |
| Speed/Cadence | 0x1816 | CSC Measurement (0x2A5B) |
| SRAM AXS | Proprietary | Gear position, battery |

### LiDAR Body Measurement System

Use iOS LiDAR (iPhone Pro/iPad Pro) to automatically measure body dimensions for bike fitting. This eliminates the need for manual measurements and provides more accurate, repeatable data.

**Supported Measurements:**
- Inseam length (floor to crotch)
- Torso length
- Arm length and reach
- Shoulder width
- Leg segment lengths (thigh, lower leg)
- Standing height

**Technical Approach:**

```typescript
interface LiDARMeasurementSession {
  id: string;
  userId: string;
  capturedAt: Date;
  deviceModel: string;

  // Captured body landmarks
  landmarks: {
    // Head and torso
    headTop: Point3D;
    sternumNotch: Point3D;
    shoulderLeft: Point3D;
    shoulderRight: Point3D;

    // Hips and legs
    hipLeft: Point3D;
    hipRight: Point3D;
    kneeLeft: Point3D;
    kneeRight: Point3D;
    ankleLeft: Point3D;
    ankleRight: Point3D;
    heelLeft: Point3D;
    heelRight: Point3D;

    // Arms
    elbowLeft: Point3D;
    elbowRight: Point3D;
    wristLeft: Point3D;
    wristRight: Point3D;

    // Reference points
    floorPlane: Plane3D;
    crotchPoint: Point3D;
  };

  // Calculated measurements (mm)
  measurements: {
    inseam: number;
    torsoLength: number;
    armLength: number;
    forearmLength: number;
    shoulderWidth: number;
    thighLength: number;
    lowerLegLength: number;
    standingHeight: number;
  };

  // Quality metrics
  confidence: number;         // 0-100
  lightingQuality: 'poor' | 'fair' | 'good' | 'excellent';
  scanCoverage: number;       // Percentage of body captured
}

interface Point3D {
  x: number;
  y: number;
  z: number;
  confidence: number;
}
```

**Implementation Requirements:**
- iOS 14+ with LiDAR-equipped device (iPhone 12 Pro+, iPad Pro 2020+)
- ARKit for scene understanding and body detection
- RealityKit for 3D mesh capture
- Vision framework for body pose estimation (fallback for non-LiDAR devices)

**User Flow:**
1. User selects "Measure Body" from profile settings
2. App guides user through positioning (stand against wall, arms at sides)
3. User slowly rotates while app captures LiDAR depth data
4. App processes scan to identify body landmarks
5. Measurements calculated and displayed for confirmation
6. User can adjust any measurements manually if needed
7. Data synced to web app and used for fit calculations

**Fallback for Non-LiDAR Devices:**
- Use ARKit body tracking with camera-only depth estimation
- Guide user through manual measurement with AR overlays
- Lower confidence scores for camera-only measurements

**Privacy Considerations:**
- 3D scan data processed entirely on-device
- Only extracted measurements (numbers) stored in cloud
- Raw mesh data never leaves device
- User can delete measurement history

### Implementation Steps

1. **Expo Configuration**
   - Set up Expo dev build (not Expo Go - need native modules)
   - Configure app.json with proper permissions
   - Add Mapbox token configuration
   - Set up EAS Build for iOS/Android

2. **Core Screens**
   - Implement MapScreen with Mapbox
   - Implement DataScreen with widget grid
   - Wire up navigation

3. **BLE Integration**
   - Implement BLEManager service
   - Add sensor scanning and pairing
   - Create sensor data streams

4. **Ride Recording**
   - Implement location tracking
   - Create ride state machine
   - Add local storage for ride data

5. **Sync & Offline**
   - Fetch layouts from Supabase
   - Cache for offline use
   - Sync completed rides

---

## Phase 6: Clubs & Teams

Social features for group cycling, team management, and community building.

### Club Management

| Feature | Description | Priority |
|---------|-------------|----------|
| Create Club | Start a new club with name, description, logo | High |
| Join Club | Request to join or accept invitation | High |
| Member Roles | Admin, moderator, member permissions | High |
| Club Profile | Public page with stats, members, recent activity | High |
| Private Clubs | Invite-only clubs for teams | Medium |
| Club Settings | Privacy, join requirements, branding | Medium |
| Multiple Clubs | Users can belong to multiple clubs | Medium |
| Club Search | Discover clubs by location, type, size | Low |

### Shared Resources

| Feature | Description | Priority |
|---------|-------------|----------|
| Club Routes | Shared route library for members | High |
| Club Events | Group rides with RSVP | High |
| Training Plans | Team training plans and workouts | Medium |
| Club Announcements | News and updates from admins | Medium |
| Shared Layouts | Club-branded data screen templates | Low |
| Equipment Pool | Shared bike/wheel tracking for teams | Low |

### Social Features

| Feature | Description | Priority |
|---------|-------------|----------|
| Activity Feed | See club members' recent rides | High |
| Leaderboards | Club rankings by distance, elevation, TSS | High |
| Challenges | Time-limited club competitions | Medium |
| Comments & Kudos | Interact with member activities | Medium |
| Club Chat | In-app messaging for members | Medium |
| Ride Invites | Invite members to upcoming rides | Medium |
| Segments | Club-specific segments and KOMs | Low |

### Team Analytics

| Feature | Description | Priority |
|---------|-------------|----------|
| Team Dashboard | Aggregate stats for club | High |
| Weekly Summary | Club activity digest | Medium |
| Member Progress | Individual member metrics over time | Medium |
| Training Load | Team CTL/ATL/TSB overview | Medium |
| Comparative Stats | Member vs member analytics | Low |
| Export Reports | PDF/CSV team reports | Low |

### Data Model

```typescript
interface Club {
  id: string;
  name: string;
  description: string;
  logoUrl?: string;
  coverImageUrl?: string;
  type: 'club' | 'team' | 'shop' | 'event';
  sport: 'road' | 'mtb' | 'gravel' | 'all';
  location?: {
    city: string;
    region: string;
    country: string;
    coordinates?: [number, number];
  };
  privacy: 'public' | 'private' | 'secret';
  joinPolicy: 'open' | 'request' | 'invite_only';
  memberCount: number;
  createdAt: Date;
  createdBy: string;
  settings: ClubSettings;
}

interface ClubMembership {
  id: string;
  clubId: string;
  userId: string;
  role: 'owner' | 'admin' | 'moderator' | 'member';
  status: 'active' | 'pending' | 'invited' | 'banned';
  joinedAt: Date;
  invitedBy?: string;
}

interface ClubEvent {
  id: string;
  clubId: string;
  name: string;
  description: string;
  eventType: 'group_ride' | 'race' | 'training' | 'social';
  startTime: Date;
  duration?: number;           // minutes
  routeId?: string;
  meetingPoint?: {
    name: string;
    coordinates: [number, number];
  };
  maxParticipants?: number;
  rsvps: {
    going: string[];
    maybe: string[];
    notGoing: string[];
  };
  createdBy: string;
  isRecurring: boolean;
  recurrenceRule?: string;     // RRULE format
}

interface ClubChallenge {
  id: string;
  clubId: string;
  name: string;
  description: string;
  type: 'distance' | 'elevation' | 'time' | 'rides' | 'streak';
  target: number;
  unit: string;
  startDate: Date;
  endDate: Date;
  leaderboard: {
    userId: string;
    value: number;
    rank: number;
  }[];
  prizes?: string[];
  createdBy: string;
}

interface ClubLeaderboard {
  clubId: string;
  period: 'week' | 'month' | 'year' | 'all_time';
  metric: 'distance' | 'elevation' | 'time' | 'tss' | 'rides';
  entries: {
    userId: string;
    displayName: string;
    value: number;
    rank: number;
    change: number;          // rank change from previous period
  }[];
  updatedAt: Date;
}
```

### Database Schema

```sql
clubs
├── id               UUID PRIMARY KEY
├── name             TEXT NOT NULL
├── slug             TEXT UNIQUE
├── description      TEXT
├── logo_url         TEXT
├── cover_image_url  TEXT
├── type             TEXT DEFAULT 'club'
├── sport            TEXT DEFAULT 'all'
├── city             TEXT
├── region           TEXT
├── country          TEXT
├── coordinates      POINT
├── privacy          TEXT DEFAULT 'public'
├── join_policy      TEXT DEFAULT 'open'
├── member_count     INTEGER DEFAULT 0
├── settings         JSONB DEFAULT '{}'
├── created_by       UUID REFERENCES auth.users
├── created_at       TIMESTAMP DEFAULT NOW()
└── updated_at       TIMESTAMP

club_memberships
├── id               UUID PRIMARY KEY
├── club_id          UUID REFERENCES clubs ON DELETE CASCADE
├── user_id          UUID REFERENCES auth.users ON DELETE CASCADE
├── role             TEXT DEFAULT 'member'
├── status           TEXT DEFAULT 'active'
├── joined_at        TIMESTAMP DEFAULT NOW()
├── invited_by       UUID REFERENCES auth.users
├── UNIQUE(club_id, user_id)

club_routes
├── id               UUID PRIMARY KEY
├── club_id          UUID REFERENCES clubs ON DELETE CASCADE
├── route_id         UUID REFERENCES routes ON DELETE CASCADE
├── added_by         UUID REFERENCES auth.users
├── added_at         TIMESTAMP DEFAULT NOW()
├── is_featured      BOOLEAN DEFAULT false
├── notes            TEXT
├── UNIQUE(club_id, route_id)

club_events
├── id               UUID PRIMARY KEY
├── club_id          UUID REFERENCES clubs ON DELETE CASCADE
├── name             TEXT NOT NULL
├── description      TEXT
├── event_type       TEXT DEFAULT 'group_ride'
├── start_time       TIMESTAMP NOT NULL
├── duration_minutes INTEGER
├── route_id         UUID REFERENCES routes
├── meeting_point    JSONB
├── max_participants INTEGER
├── is_recurring     BOOLEAN DEFAULT false
├── recurrence_rule  TEXT
├── created_by       UUID REFERENCES auth.users
├── created_at       TIMESTAMP DEFAULT NOW()

club_event_rsvps
├── id               UUID PRIMARY KEY
├── event_id         UUID REFERENCES club_events ON DELETE CASCADE
├── user_id          UUID REFERENCES auth.users ON DELETE CASCADE
├── status           TEXT DEFAULT 'going'
├── responded_at     TIMESTAMP DEFAULT NOW()
├── UNIQUE(event_id, user_id)

club_challenges
├── id               UUID PRIMARY KEY
├── club_id          UUID REFERENCES clubs ON DELETE CASCADE
├── name             TEXT NOT NULL
├── description      TEXT
├── challenge_type   TEXT NOT NULL
├── target           DECIMAL NOT NULL
├── unit             TEXT NOT NULL
├── start_date       DATE NOT NULL
├── end_date         DATE NOT NULL
├── prizes           TEXT[]
├── created_by       UUID REFERENCES auth.users
├── created_at       TIMESTAMP DEFAULT NOW()

club_challenge_progress
├── id               UUID PRIMARY KEY
├── challenge_id     UUID REFERENCES club_challenges ON DELETE CASCADE
├── user_id          UUID REFERENCES auth.users ON DELETE CASCADE
├── current_value    DECIMAL DEFAULT 0
├── last_updated     TIMESTAMP DEFAULT NOW()
├── UNIQUE(challenge_id, user_id)

club_announcements
├── id               UUID PRIMARY KEY
├── club_id          UUID REFERENCES clubs ON DELETE CASCADE
├── title            TEXT NOT NULL
├── content          TEXT NOT NULL
├── is_pinned        BOOLEAN DEFAULT false
├── created_by       UUID REFERENCES auth.users
├── created_at       TIMESTAMP DEFAULT NOW()

-- Materialized view for leaderboards (refresh periodically)
CREATE MATERIALIZED VIEW club_leaderboards AS
SELECT
  club_id,
  user_id,
  'week' as period,
  SUM(distance_m) / 1000 as total_distance_km,
  SUM(elevation_gain_m) as total_elevation_m,
  SUM(elapsed_time_s) / 3600 as total_hours,
  COUNT(*) as ride_count
FROM rides r
JOIN club_memberships cm ON r.user_id = cm.user_id
WHERE r.created_at > NOW() - INTERVAL '7 days'
  AND cm.status = 'active'
GROUP BY club_id, user_id;
```

### Club Features Workflow

```text
┌─────────────────────────────────────────────────────────────────────┐
│                        Club Experience                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────┐                                                │
│  │  Discover Clubs │                                                │
│  │  ─────────────  │                                                │
│  │  🔍 Search by   │                                                │
│  │    location,    │                                                │
│  │    type, name   │                                                │
│  └────────┬────────┘                                                │
│           │                                                          │
│           ▼                                                          │
│  ┌─────────────────┐     ┌─────────────────┐                       │
│  │   Club Page     │     │  Create Club    │                       │
│  │  ─────────────  │     │  ────────────   │                       │
│  │  📊 Stats       │     │  Name, logo,    │                       │
│  │  👥 Members     │     │  description,   │                       │
│  │  🗺️ Routes     │     │  settings       │                       │
│  │  📅 Events      │     └─────────────────┘                       │
│  │  [Join Club]    │                                                │
│  └────────┬────────┘                                                │
│           │                                                          │
│           ▼                                                          │
│  ┌─────────────────────────────────────────────────────────┐       │
│  │                    Club Dashboard                         │       │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │       │
│  │  │  Feed    │  │  Routes  │  │  Events  │  │  Members │ │       │
│  │  │  ──────  │  │  ──────  │  │  ──────  │  │  ──────  │ │       │
│  │  │ Recent   │  │ Shared   │  │ Upcoming │  │ Rankings │ │       │
│  │  │ activity │  │ routes   │  │ rides    │  │ & roles  │ │       │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘ │       │
│  │                                                           │       │
│  │  ┌──────────────────────────────────────────────────────┐│       │
│  │  │              Active Challenges                        ││       │
│  │  │  🏆 January Distance: 847/1000 km  [Your rank: #3]   ││       │
│  │  │  ⛰️ Climb Everest: 4,200/8,848 m   [Your rank: #7]   ││       │
│  │  └──────────────────────────────────────────────────────┘│       │
│  └─────────────────────────────────────────────────────────┘       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Technical Considerations

### Mobile App Architecture Updates

```
apps/mobile/src/
├── services/
│   ├── recording/
│   │   ├── RecordingService.ts    # GPS + sensor coordination
│   │   ├── TrackPointBuffer.ts    # In-memory point storage
│   │   └── ActivityExporter.ts    # GPX/FIT generation
│   │
│   ├── sync/
│   │   ├── SyncManager.ts         # Orchestrate all syncs
│   │   ├── StravaClient.ts        # Strava API wrapper
│   │   ├── GarminClient.ts        # Garmin API wrapper
│   │   └── RWGPSClient.ts         # RideWithGPS wrapper
│   │
│   └── training/
│       ├── WorkoutPlayer.ts       # Execute structured workouts
│       ├── IntervalTimer.ts       # Interval timing logic
│       └── ComplianceTracker.ts   # Track target adherence
│
├── screens/
│   ├── Recording/
│   │   ├── PreRideScreen.tsx
│   │   ├── RecordingScreen.tsx
│   │   ├── PausedScreen.tsx
│   │   └── SummaryScreen.tsx
│   │
│   └── Training/
│       ├── WorkoutScreen.tsx
│       └── WorkoutSummaryScreen.tsx
│
└── stores/
    ├── recordingStore.ts          # Recording state
    ├── athleteStore.ts            # Profile & zones
    └── bikeStore.ts               # Bike configurations
```

### Backend API Additions

```
Supabase Edge Functions:

/functions/
├── strava-auth/          # OAuth flow for Strava
├── strava-sync/          # Activity upload/download
├── garmin-auth/          # OAuth flow for Garmin
├── garmin-sync/          # Activity upload/download
├── calculate-metrics/    # TSS, CTL, ATL computation
└── generate-fit/         # FIT file generation
```

### Security Considerations

- OAuth tokens stored encrypted in database
- Refresh tokens rotated on each use
- User consent required for each integration scope
- Activity data never shared between users
- GDPR compliance for EU users (data export/deletion)

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Ride recording adoption | 80% of active users | Weekly active recorders |
| Strava sync usage | 60% of users connected | Integration connections |
| Average rides per week | 3+ per active user | Ride count |
| Workout compliance | 75% average | Planned vs actual |
| User retention (30-day) | 70% | Return visits |
| App store rating | 4.5+ stars | Store reviews |

---

## Timeline Estimate

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: User Profiles | 2-3 weeks | None |
| Phase 2: Ride Recording | 4-6 weeks | Phase 1 |
| Phase 3: Integrations | 4-6 weeks | Phase 2 |
| Phase 4: Service Course | 2-3 weeks | Phase 1 |
| Phase 5: Training Platform | 8-12 weeks | Phases 1-3 |

**Note:** Timeline estimates assume a small development team (2-3 developers). Phases can overlap where dependencies allow.

---

## Contributing

We welcome contributions to any phase of the roadmap. Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on:

- Setting up the development environment
- Submitting pull requests
- Code style and testing requirements
- Feature proposal process

For large features, please open a GitHub Discussion before starting implementation to ensure alignment with project goals.
