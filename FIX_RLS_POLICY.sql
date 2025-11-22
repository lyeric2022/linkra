-- Run this in your Supabase SQL Editor to fix the RLS policy

-- First, let's completely drop and recreate the startup update policy
DROP POLICY IF EXISTS "Authenticated users can update startups" ON public.startups;

-- Create a new policy that allows all authenticated users to update any startup
CREATE POLICY "Authenticated users can update startups" ON public.startups
  FOR UPDATE
  USING (true)  -- Can read/select any row
  WITH CHECK (true);  -- Can write any values

-- Verify the policy was created
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'startups' AND policyname = 'Authenticated users can update startups';
