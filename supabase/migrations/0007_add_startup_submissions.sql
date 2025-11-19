-- Migration: 0007_add_startup_submissions.sql
-- Description: Add table for pending startup submissions (to be manually reviewed and added)

-- Startup submissions table (pending submissions)
CREATE TABLE IF NOT EXISTS public.startup_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  website TEXT,
  sector TEXT,
  stage TEXT, -- e.g., 'seed', 'series-a', 'series-b', etc.
  location TEXT,
  logo_url TEXT,
  batch TEXT, -- YC batch (e.g., 'Winter 2024', 'Summer 2024')
  submitted_by UUID REFERENCES public.users(id) ON DELETE SET NULL, -- Optional: track who submitted
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_submissions_status ON public.startup_submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_created_at ON public.startup_submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_submitted_by ON public.startup_submissions(submitted_by);

-- Enable RLS
ALTER TABLE public.startup_submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Anyone can read submissions (for transparency)
DROP POLICY IF EXISTS "Anyone can read submissions" ON public.startup_submissions;
CREATE POLICY "Anyone can read submissions" ON public.startup_submissions
  FOR SELECT USING (true);

-- RLS Policy: Authenticated users can create submissions
DROP POLICY IF EXISTS "Authenticated users can create submissions" ON public.startup_submissions;
CREATE POLICY "Authenticated users can create submissions" ON public.startup_submissions
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- RLS Policy: Only service role can update (for admin review)
-- This will be handled by admin tools using service role key

-- Trigger for updated_at
CREATE TRIGGER update_submissions_updated_at
  BEFORE UPDATE ON public.startup_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

