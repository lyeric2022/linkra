-- Migration: 0011_update_price_history_to_5min.sql
-- Description: Update price history table to support 5-minute intervals

-- Rename hour_timestamp to interval_timestamp for clarity
ALTER TABLE public.startup_price_history
  RENAME COLUMN hour_timestamp TO interval_timestamp;

-- Drop old unique index
DROP INDEX IF EXISTS idx_price_history_unique_hour;

-- Create new unique constraint for 5-minute intervals
CREATE UNIQUE INDEX IF NOT EXISTS idx_price_history_unique_interval
  ON public.startup_price_history(startup_id, interval_timestamp);

-- Update the index name in schema if needed
DROP INDEX IF EXISTS idx_price_history_timestamp;
CREATE INDEX IF NOT EXISTS idx_price_history_timestamp
  ON public.startup_price_history(interval_timestamp DESC);
