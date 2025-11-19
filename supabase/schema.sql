-- Linkra Database Schema
-- Run this in your Supabase SQL editor to set up the database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT, -- Display name (from Google OAuth or derived from email)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  virtual_currency NUMERIC(10, 2) DEFAULT 10000.00, -- Starting currency
  free_gifts_count INTEGER DEFAULT 5 NOT NULL -- Number of free gift rolls remaining (default 5)
);

-- Startups table
CREATE TABLE IF NOT EXISTS public.startups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  website TEXT,
  sector TEXT,
  stage TEXT, -- e.g., 'seed', 'series-a', 'series-b', etc.
  location TEXT,
  logo_url TEXT,
  batch TEXT, -- YC batch (e.g., 'Winter 2024', 'Summer 2024')
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Computed fields (updated by ranking algorithm)
  global_rank INTEGER,
  elo_rating NUMERIC(10, 2) DEFAULT 1500.00, -- Starting Elo rating
  market_price NUMERIC(10, 2) DEFAULT 10.00 -- Starting market price
);

-- Pairwise comparisons table
CREATE TABLE IF NOT EXISTS public.pairwise_comparisons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  startup_a_id UUID NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  startup_b_id UUID NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  chosen_startup_id UUID NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Ensure chosen_startup_id is one of the two startups being compared
  CONSTRAINT valid_choice CHECK (chosen_startup_id IN (startup_a_id, startup_b_id))
);

-- Holdings table (user's positions in startups)
-- Negative quantity = short position (betting down), positive = long position (betting up)
CREATE TABLE IF NOT EXISTS public.holdings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  startup_id UUID NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity != 0), -- Allow negative for shorts
  average_cost NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (average_cost >= 0), -- Entry price (always positive)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- One holding per user per startup
  UNIQUE(user_id, startup_id)
);

-- Trades table (transaction history)
-- trade_type: 'buy' = buy long, 'sell' = sell long, 'bet_down' = open short, 'cover' = close short
CREATE TABLE IF NOT EXISTS public.trades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  startup_id UUID NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  trade_type TEXT NOT NULL CHECK (trade_type IN ('buy', 'sell', 'bet_down', 'cover')),
  quantity INTEGER NOT NULL CHECK (quantity > 0), -- Always positive, direction indicated by trade_type
  price NUMERIC(10, 2) NOT NULL CHECK (price > 0),
  total_value NUMERIC(10, 2) NOT NULL CHECK (total_value > 0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Startup submissions table (pending submissions for manual review)
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_startups_rank ON public.startups(global_rank);
CREATE INDEX IF NOT EXISTS idx_startups_elo ON public.startups(elo_rating);
CREATE INDEX IF NOT EXISTS idx_startups_batch ON public.startups(batch);
CREATE INDEX IF NOT EXISTS idx_comparisons_user ON public.pairwise_comparisons(user_id);
CREATE INDEX IF NOT EXISTS idx_comparisons_startups ON public.pairwise_comparisons(startup_a_id, startup_b_id);
CREATE INDEX IF NOT EXISTS idx_holdings_user ON public.holdings(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_user ON public.trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_startup ON public.trades(startup_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON public.startup_submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_created_at ON public.startup_submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_submitted_by ON public.startup_submissions(submitted_by);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.startups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pairwise_comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.startup_submissions ENABLE ROW LEVEL SECURITY;

-- Users: Users can read all, but only update their own
DROP POLICY IF EXISTS "Users can read all users" ON public.users;
CREATE POLICY "Users can read all users" ON public.users
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own record" ON public.users;
CREATE POLICY "Users can insert own record" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Startups: Everyone can read, authenticated users can insert
DROP POLICY IF EXISTS "Anyone can read startups" ON public.startups;
CREATE POLICY "Anyone can read startups" ON public.startups
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can create startups" ON public.startups;
CREATE POLICY "Authenticated users can create startups" ON public.startups
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update startups" ON public.startups;
CREATE POLICY "Authenticated users can update startups" ON public.startups
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Comparisons: Users can read all, but only create their own
DROP POLICY IF EXISTS "Anyone can read comparisons" ON public.pairwise_comparisons;
CREATE POLICY "Anyone can read comparisons" ON public.pairwise_comparisons
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create own comparisons" ON public.pairwise_comparisons;
CREATE POLICY "Users can create own comparisons" ON public.pairwise_comparisons
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Holdings: Users can read all, but only modify their own
DROP POLICY IF EXISTS "Anyone can read holdings" ON public.holdings;
CREATE POLICY "Anyone can read holdings" ON public.holdings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage own holdings" ON public.holdings;
CREATE POLICY "Users can manage own holdings" ON public.holdings
  FOR ALL USING (auth.uid() = user_id);

-- Trades: Users can read all, but only create their own
DROP POLICY IF EXISTS "Anyone can read trades" ON public.trades;
CREATE POLICY "Anyone can read trades" ON public.trades
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create own trades" ON public.trades;
CREATE POLICY "Users can create own trades" ON public.trades
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Startup submissions: Anyone can read, authenticated users can create
DROP POLICY IF EXISTS "Anyone can read submissions" ON public.startup_submissions;
CREATE POLICY "Anyone can read submissions" ON public.startup_submissions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can create submissions" ON public.startup_submissions;
CREATE POLICY "Authenticated users can create submissions" ON public.startup_submissions
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Function to automatically create user record on signup
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

-- Trigger to create user record when auth user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_startups_updated_at
  BEFORE UPDATE ON public.startups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_holdings_updated_at
  BEFORE UPDATE ON public.holdings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_submissions_updated_at
  BEFORE UPDATE ON public.startup_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

