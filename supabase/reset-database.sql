-- Reset Database Script
-- WARNING: This will DELETE ALL DATA from all tables
-- Use with caution! This cannot be undone.
-- Run this in Supabase SQL Editor to reset everything

-- Disable triggers temporarily to avoid issues
SET session_replication_role = 'replica';

-- Clear all data (in order to respect foreign key constraints)
DELETE FROM public.trades;
DELETE FROM public.holdings;
DELETE FROM public.pairwise_comparisons;
DELETE FROM public.startups;
DELETE FROM public.users;

-- Re-enable triggers
SET session_replication_role = 'origin';

-- Reset sequences (if any)
-- Note: UUIDs don't use sequences, but if you add auto-increment IDs later, reset them here

-- Verify tables are empty
SELECT 
  'users' as table_name, COUNT(*) as row_count FROM public.users
UNION ALL
SELECT 'startups', COUNT(*) FROM public.startups
UNION ALL
SELECT 'pairwise_comparisons', COUNT(*) FROM public.pairwise_comparisons
UNION ALL
SELECT 'holdings', COUNT(*) FROM public.holdings
UNION ALL
SELECT 'trades', COUNT(*) FROM public.trades;

-- Output: All tables should show 0 rows

