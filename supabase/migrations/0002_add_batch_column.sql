-- Migration: 0002_add_batch_column.sql
-- Description: Add batch column to startups table for YC batch filtering

ALTER TABLE public.startups 
ADD COLUMN IF NOT EXISTS batch TEXT;

CREATE INDEX IF NOT EXISTS idx_startups_batch ON public.startups(batch);

