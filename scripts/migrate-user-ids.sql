-- Migration: Change user IDs from UUID to TEXT for Auth0 compatibility
-- This allows Auth0 user IDs like "google-oauth2|123456789" or "auth0|abc123"

BEGIN;

-- Step 1: Drop the trigger and function FIRST (they reference auth.users)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Step 2: Drop ALL RLS policies that reference the id columns BEFORE altering types
DROP POLICY IF EXISTS "Users can insert own record" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can create own comparisons" ON public.pairwise_comparisons;
DROP POLICY IF EXISTS "Users can manage own holdings" ON public.holdings;
DROP POLICY IF EXISTS "Users can create own trades" ON public.trades;

-- Step 3: Drop the foreign key constraint from users table to auth.users
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_id_fkey;

-- Step 4: Drop all foreign key constraints that reference users.id
ALTER TABLE public.pairwise_comparisons DROP CONSTRAINT IF EXISTS pairwise_comparisons_user_id_fkey;
ALTER TABLE public.holdings DROP CONSTRAINT IF EXISTS holdings_user_id_fkey;
ALTER TABLE public.trades DROP CONSTRAINT IF EXISTS trades_user_id_fkey;
ALTER TABLE public.startup_submissions DROP CONSTRAINT IF EXISTS startup_submissions_submitted_by_fkey;

-- Step 5: Change users.id from UUID to TEXT
ALTER TABLE public.users ALTER COLUMN id TYPE TEXT;

-- Step 6: Change foreign key columns from UUID to TEXT
ALTER TABLE public.pairwise_comparisons ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE public.holdings ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE public.trades ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE public.startup_submissions ALTER COLUMN submitted_by TYPE TEXT;

-- Step 7: Re-add foreign key constraints
ALTER TABLE public.pairwise_comparisons
  ADD CONSTRAINT pairwise_comparisons_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.holdings
  ADD CONSTRAINT holdings_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.trades
  ADD CONSTRAINT trades_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.startup_submissions
  ADD CONSTRAINT startup_submissions_submitted_by_fkey
  FOREIGN KEY (submitted_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- Step 8: Create new permissive RLS policies (authorization handled in app layer)
CREATE POLICY "Authenticated users can insert users" ON public.users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can update users" ON public.users
  FOR UPDATE USING (true);

CREATE POLICY "Authenticated users can create comparisons" ON public.pairwise_comparisons
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can manage holdings" ON public.holdings
  FOR ALL USING (true);

CREATE POLICY "Authenticated users can create trades" ON public.trades
  FOR INSERT WITH CHECK (true);

COMMIT;
