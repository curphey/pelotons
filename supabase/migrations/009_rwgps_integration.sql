-- RideWithGPS Integration
-- Enables bi-directional sync of routes and collections with RideWithGPS

-- Store RWGPS OAuth connections per user
CREATE TABLE IF NOT EXISTS rwgps_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  rwgps_user_id INTEGER NOT NULL,
  rwgps_username TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS on rwgps_connections
ALTER TABLE rwgps_connections ENABLE ROW LEVEL SECURITY;

-- Users can only see/modify their own connection
CREATE POLICY "Users can view own RWGPS connection"
  ON rwgps_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own RWGPS connection"
  ON rwgps_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own RWGPS connection"
  ON rwgps_connections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own RWGPS connection"
  ON rwgps_connections FOR DELETE
  USING (auth.uid() = user_id);

-- Track sync state for routes
ALTER TABLE routes
ADD COLUMN IF NOT EXISTS rwgps_id INTEGER,
ADD COLUMN IF NOT EXISTS rwgps_synced_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rwgps_sync_direction TEXT;

-- Add constraint for sync direction (only if column was just added)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_rwgps_sync_direction'
  ) THEN
    ALTER TABLE routes
    ADD CONSTRAINT check_rwgps_sync_direction
    CHECK (rwgps_sync_direction IS NULL OR rwgps_sync_direction IN ('push', 'pull', 'both'));
  END IF;
END $$;

-- Track sync state for collections
ALTER TABLE route_collections
ADD COLUMN IF NOT EXISTS rwgps_id INTEGER,
ADD COLUMN IF NOT EXISTS rwgps_synced_at TIMESTAMPTZ;

-- Indexes for fast RWGPS ID lookups
CREATE INDEX IF NOT EXISTS idx_routes_rwgps_id ON routes(rwgps_id) WHERE rwgps_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_collections_rwgps_id ON route_collections(rwgps_id) WHERE rwgps_id IS NOT NULL;

-- Index for finding user's RWGPS connection quickly
CREATE INDEX IF NOT EXISTS idx_rwgps_connections_user_id ON rwgps_connections(user_id);
