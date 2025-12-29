-- Migration: Add athlete profiles table
-- This table stores user physiological data and preferences needed for
-- calculating metrics like W/kg, power zones, heart rate zones, TSS, etc.

CREATE TABLE IF NOT EXISTS athlete_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Basic info
  display_name TEXT,
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),

  -- Physical stats (stored in metric)
  weight_kg DECIMAL(5,2),
  height_cm INTEGER,

  -- Power settings
  ftp_watts INTEGER,

  -- Heart rate settings
  max_hr_bpm INTEGER,
  resting_hr_bpm INTEGER,
  lthr_bpm INTEGER,  -- Lactate threshold heart rate

  -- Preferences
  unit_system TEXT NOT NULL DEFAULT 'metric' CHECK (unit_system IN ('metric', 'imperial')),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure one profile per user
  CONSTRAINT unique_user_profile UNIQUE (user_id)
);

-- Enable RLS
ALTER TABLE athlete_profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own athlete profile"
  ON athlete_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own athlete profile"
  ON athlete_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own athlete profile"
  ON athlete_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own athlete profile"
  ON athlete_profiles FOR DELETE
  USING (auth.uid() = user_id);

-- Index for user lookup
CREATE INDEX idx_athlete_profiles_user_id ON athlete_profiles(user_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_athlete_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_athlete_profiles_updated_at
  BEFORE UPDATE ON athlete_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_athlete_profiles_updated_at();
