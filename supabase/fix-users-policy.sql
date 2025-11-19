-- Fix: Add INSERT policy for users table
-- Run this in Supabase SQL Editor if you get 403 errors when creating user records

CREATE POLICY "Users can insert own record" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

