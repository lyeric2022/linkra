-- Migration: 0004_add_startups_update_policy.sql
-- Description: Add RLS policy to allow authenticated users to update startup Elo ratings

-- Allow authenticated users to update startups (for Elo rating updates)
DROP POLICY IF EXISTS "Authenticated users can update startups" ON public.startups;
CREATE POLICY "Authenticated users can update startups" ON public.startups
  FOR UPDATE USING (auth.role() = 'authenticated');

