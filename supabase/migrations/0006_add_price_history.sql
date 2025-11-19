-- Migration: 0006_add_price_history.sql
-- Description: Add table to track hourly price history for startups

-- Price history table (hourly snapshots)
CREATE TABLE IF NOT EXISTS public.startup_price_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  startup_id UUID NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  elo_rating NUMERIC(10, 2) NOT NULL,
  price NUMERIC(10, 2) NOT NULL, -- Calculated price (elo_rating / 100)
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Store hour timestamp for unique constraint (truncated to hour, set by application)
  hour_timestamp TIMESTAMPTZ NOT NULL
);

-- Create unique constraint for one record per startup per hour
CREATE UNIQUE INDEX IF NOT EXISTS idx_price_history_unique_hour 
ON public.startup_price_history(startup_id, hour_timestamp);

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_price_history_startup ON public.startup_price_history(startup_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_price_history_recorded_at ON public.startup_price_history(recorded_at DESC);

-- Enable RLS
ALTER TABLE public.startup_price_history ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Anyone can read price history
DROP POLICY IF EXISTS "Anyone can read price history" ON public.startup_price_history;
CREATE POLICY "Anyone can read price history" ON public.startup_price_history
  FOR SELECT USING (true);

-- RLS Policy: Only service role can insert (for scheduled jobs)
-- This will be handled by the API route using service role key

