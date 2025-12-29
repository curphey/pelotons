/**
 * Athlete Profile - User's physiological data and preferences
 * Used for calculating metrics like W/kg, power zones, HR zones, TSS, etc.
 */
export interface AthleteProfile {
  id: string;
  userId: string;
  displayName: string | null;
  dateOfBirth: string | null; // ISO date string
  gender: 'male' | 'female' | 'other' | null;

  // Weight (required for W/kg calculations)
  weightKg: number | null;

  // Height (optional, for fit calculations)
  heightCm: number | null;

  // Power settings (required for power zones, %FTP, IF, TSS)
  ftpWatts: number | null;

  // Heart rate settings (required for HR zones)
  maxHrBpm: number | null;
  restingHrBpm: number | null;
  lthrBpm: number | null; // Lactate threshold heart rate

  // Preferences
  unitSystem: 'metric' | 'imperial';

  createdAt: string;
  updatedAt: string;
}

/**
 * Input type for creating/updating athlete profile
 */
export interface AthleteProfileInput {
  displayName?: string | null;
  dateOfBirth?: string | null;
  gender?: 'male' | 'female' | 'other' | null;
  weightKg?: number | null;
  heightCm?: number | null;
  ftpWatts?: number | null;
  maxHrBpm?: number | null;
  restingHrBpm?: number | null;
  lthrBpm?: number | null;
  unitSystem?: 'metric' | 'imperial';
}

/**
 * Calculated power zones based on FTP
 * Uses Coggan 7-zone model
 */
export interface PowerZones {
  ftp: number;
  zones: PowerZone[];
}

export interface PowerZone {
  zone: number;
  name: string;
  minWatts: number;
  maxWatts: number | null; // null for zone 7 (no upper limit)
  minPercent: number;
  maxPercent: number | null;
  color: string;
}

/**
 * Calculated heart rate zones based on max HR or LTHR
 */
export interface HeartRateZones {
  maxHr: number;
  lthr: number | null;
  zones: HeartRateZone[];
}

export interface HeartRateZone {
  zone: number;
  name: string;
  minBpm: number;
  maxBpm: number | null;
  minPercent: number;
  maxPercent: number | null;
  color: string;
}

/**
 * Calculate power zones from FTP using Coggan model
 */
export function calculatePowerZones(ftp: number): PowerZones {
  return {
    ftp,
    zones: [
      { zone: 1, name: 'Active Recovery', minWatts: 0, maxWatts: Math.round(ftp * 0.55), minPercent: 0, maxPercent: 55, color: '#9ca3af' },
      { zone: 2, name: 'Endurance', minWatts: Math.round(ftp * 0.55), maxWatts: Math.round(ftp * 0.75), minPercent: 55, maxPercent: 75, color: '#3b82f6' },
      { zone: 3, name: 'Tempo', minWatts: Math.round(ftp * 0.75), maxWatts: Math.round(ftp * 0.90), minPercent: 75, maxPercent: 90, color: '#22c55e' },
      { zone: 4, name: 'Threshold', minWatts: Math.round(ftp * 0.90), maxWatts: Math.round(ftp * 1.05), minPercent: 90, maxPercent: 105, color: '#f59e0b' },
      { zone: 5, name: 'VO2max', minWatts: Math.round(ftp * 1.05), maxWatts: Math.round(ftp * 1.20), minPercent: 105, maxPercent: 120, color: '#ef4444' },
      { zone: 6, name: 'Anaerobic', minWatts: Math.round(ftp * 1.20), maxWatts: Math.round(ftp * 1.50), minPercent: 120, maxPercent: 150, color: '#dc2626' },
      { zone: 7, name: 'Neuromuscular', minWatts: Math.round(ftp * 1.50), maxWatts: null, minPercent: 150, maxPercent: null, color: '#7c2d12' },
    ],
  };
}

/**
 * Calculate heart rate zones from max HR using 5-zone model
 */
export function calculateHeartRateZones(maxHr: number, lthr?: number | null): HeartRateZones {
  return {
    maxHr,
    lthr: lthr ?? null,
    zones: [
      { zone: 1, name: 'Recovery', minBpm: Math.round(maxHr * 0.50), maxBpm: Math.round(maxHr * 0.60), minPercent: 50, maxPercent: 60, color: '#9ca3af' },
      { zone: 2, name: 'Endurance', minBpm: Math.round(maxHr * 0.60), maxBpm: Math.round(maxHr * 0.70), minPercent: 60, maxPercent: 70, color: '#3b82f6' },
      { zone: 3, name: 'Tempo', minBpm: Math.round(maxHr * 0.70), maxBpm: Math.round(maxHr * 0.80), minPercent: 70, maxPercent: 80, color: '#22c55e' },
      { zone: 4, name: 'Threshold', minBpm: Math.round(maxHr * 0.80), maxBpm: Math.round(maxHr * 0.90), minPercent: 80, maxPercent: 90, color: '#f59e0b' },
      { zone: 5, name: 'VO2max', minBpm: Math.round(maxHr * 0.90), maxBpm: maxHr, minPercent: 90, maxPercent: 100, color: '#ef4444' },
    ],
  };
}

/**
 * Calculate W/kg from power and weight
 */
export function calculateWattsPerKg(watts: number, weightKg: number): number {
  if (weightKg <= 0) return 0;
  return Math.round((watts / weightKg) * 100) / 100;
}

/**
 * Calculate age from date of birth
 */
export function calculateAge(dateOfBirth: string): number {
  const today = new Date();
  const birth = new Date(dateOfBirth);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

/**
 * Estimate max HR from age (220 - age formula)
 * Note: This is a rough estimate; actual testing is more accurate
 */
export function estimateMaxHr(age: number): number {
  return Math.round(220 - age);
}
