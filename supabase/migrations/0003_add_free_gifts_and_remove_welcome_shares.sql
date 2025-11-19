-- Migration: 0003_add_free_gifts_and_remove_welcome_shares.sql
-- Description: Add free_gifts_count to users, remove welcome shares functionality

-- Add free_gifts_count column to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS free_gifts_count INTEGER DEFAULT 5 NOT NULL;

-- Remove welcome shares function
DROP FUNCTION IF EXISTS public.grant_welcome_shares(UUID);

-- Update handle_new_user function to remove welcome shares grant
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create user record
  INSERT INTO public.users (id, email, virtual_currency, free_gifts_count)
  VALUES (NEW.id, NEW.email, 10000.00, 5)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

