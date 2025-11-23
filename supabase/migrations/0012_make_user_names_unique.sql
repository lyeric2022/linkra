-- Migration: 0012_make_user_names_unique.sql
-- Description: Make user names unique for safe public URLs

-- First, ensure all users have a name
UPDATE public.users
SET name = SPLIT_PART(email, '@', 1)
WHERE name IS NULL OR name = '';

-- Handle duplicate names by appending numbers
WITH duplicates AS (
  SELECT
    id,
    name,
    ROW_NUMBER() OVER (PARTITION BY name ORDER BY created_at) as row_num
  FROM public.users
)
UPDATE public.users u
SET name = d.name || '-' || d.row_num
FROM duplicates d
WHERE u.id = d.id AND d.row_num > 1;

-- Now make name unique and not null
ALTER TABLE public.users
  ALTER COLUMN name SET NOT NULL;

-- Add unique constraint
ALTER TABLE public.users
  ADD CONSTRAINT users_name_unique UNIQUE (name);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_name ON public.users(name);

-- Update the handle_new_user function to ensure unique names
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_name TEXT;
  base_name TEXT;
  counter INTEGER := 1;
BEGIN
  -- Extract name from Google OAuth metadata
  user_name := COALESCE(
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'full_name',
    SPLIT_PART(NEW.email, '@', 1)
  );

  -- Clean the name (remove special characters, make lowercase)
  base_name := LOWER(REGEXP_REPLACE(TRIM(user_name), '[^a-zA-Z0-9]+', '-', 'g'));
  base_name := TRIM(BOTH '-' FROM base_name);

  -- Start with base name
  user_name := base_name;

  -- Ensure uniqueness by appending number if needed
  WHILE EXISTS (SELECT 1 FROM public.users WHERE name = user_name) LOOP
    user_name := base_name || '-' || counter;
    counter := counter + 1;
  END LOOP;

  -- Insert user with unique name
  INSERT INTO public.users (id, email, name)
  VALUES (NEW.id, NEW.email, user_name)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
