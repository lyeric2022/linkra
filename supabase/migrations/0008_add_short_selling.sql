-- Migration: 0008_add_short_selling.sql
-- Description: Enable short selling (bet down) by allowing negative quantities and adding new trade types

-- First, delete any holdings with zero quantity (they shouldn't exist, but clean up just in case)
DELETE FROM public.holdings WHERE quantity = 0;

-- Update holdings table to allow negative quantities (for short positions)
ALTER TABLE public.holdings
  DROP CONSTRAINT IF EXISTS holdings_quantity_check;

ALTER TABLE public.holdings
  ADD CONSTRAINT holdings_quantity_check CHECK (quantity != 0); -- Allow negative, but not zero

-- Note: average_cost constraint stays >= 0 (entry price is always positive)
-- For short positions, average_cost represents the entry price when the short was opened

-- Update trades table to add bet_down and cover trade types
ALTER TABLE public.trades
  DROP CONSTRAINT IF EXISTS trades_trade_type_check;

ALTER TABLE public.trades
  ADD CONSTRAINT trades_trade_type_check CHECK (trade_type IN ('buy', 'sell', 'bet_down', 'cover'));

-- Note: 
-- - Holdings: quantity can be negative (short) or positive (long)
-- - Trades: quantity is always positive, trade_type indicates direction
-- - bet_down: Opens a short position (pay upfront, profit when price goes down)
-- - cover: Closes a short position (get back original payment + P&L)

