-- Grant Welcome Shares Function
-- This function grants 10 shares in 5 random companies to new users
-- Run this in Supabase SQL Editor to update the function

-- Function to grant welcome shares to new users (10 shares in 5 random companies)
CREATE OR REPLACE FUNCTION public.grant_welcome_shares(user_uuid UUID)
RETURNS void AS $$
DECLARE
  random_startups UUID[];
  startup_id UUID;
  shares_count INTEGER := 10;
BEGIN
  -- Check if user already has any holdings (idempotent check)
  IF EXISTS (SELECT 1 FROM public.holdings WHERE user_id = user_uuid LIMIT 1) THEN
    RETURN; -- User already has holdings, skip gift
  END IF;

  -- Select 5 random startups
  SELECT ARRAY_AGG(id) INTO random_startups
  FROM (
    SELECT id FROM public.startups
    ORDER BY RANDOM()
    LIMIT 5
  ) sub;

  -- If we have fewer than 5 startups, use what we have
  IF random_startups IS NULL OR array_length(random_startups, 1) = 0 THEN
    RETURN; -- No startups available, skip
  END IF;

  -- Grant 10 shares in each random startup
  FOREACH startup_id IN ARRAY random_startups
  LOOP
    INSERT INTO public.holdings (user_id, startup_id, quantity, average_cost)
    VALUES (user_uuid, startup_id, shares_count, 0.00)
    ON CONFLICT (user_id, startup_id) DO NOTHING;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update handle_new_user function to grant welcome shares
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create user record
  INSERT INTO public.users (id, email, virtual_currency)
  VALUES (NEW.id, NEW.email, 10000.00)
  ON CONFLICT (id) DO NOTHING;

  -- Grant welcome shares (10 shares in 5 random companies)
  PERFORM public.grant_welcome_shares(NEW.id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

