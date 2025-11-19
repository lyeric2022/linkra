-- Migration: 0005_add_user_name.sql
-- Description: Add name column to users table and update handle_new_user to extract name from Google OAuth

-- Add name column to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS name TEXT;

-- Update handle_new_user function to extract name from Google metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_name TEXT;
BEGIN
  -- Extract name from Google OAuth metadata
  -- Google provides: raw_user_meta_data->>'full_name' or raw_user_meta_data->>'name'
  -- Fallback to email username if no name provided
  user_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    SPLIT_PART(NEW.email, '@', 1)
  );
  
  -- Capitalize first letter of each word for better display
  -- Convert "ly.eric2022" -> "Ly Eric2022" or "john.doe" -> "John Doe"
  IF user_name ~ '\.' THEN
    -- Split by dots and capitalize each part
    user_name := INITCAP(REPLACE(user_name, '.', ' '));
  ELSE
    -- Capitalize first letter
    user_name := INITCAP(user_name);
  END IF;

  -- Create user record
  INSERT INTO public.users (id, email, name, virtual_currency, free_gifts_count)
  VALUES (NEW.id, NEW.email, user_name, 10000.00, 5)
  ON CONFLICT (id) DO UPDATE SET name = COALESCE(EXCLUDED.name, public.users.name);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Backfill names for existing users (derive from email)
UPDATE public.users
SET name = INITCAP(REPLACE(SPLIT_PART(email, '@', 1), '.', ' '))
WHERE name IS NULL OR name = '';

