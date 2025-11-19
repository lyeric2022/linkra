// Database types for Supabase
// These match the schema we'll create in Supabase

export interface User {
  id: string
  email: string
  name?: string // Display name (from Google OAuth or derived from email)
  created_at: string
  virtual_currency: number // Starting currency amount
  free_gifts_count: number // Number of free gift rolls remaining (default 5)
}

export interface Startup {
  id: string
  name: string
  description?: string
  website?: string
  sector?: string
  stage?: string // e.g., "seed", "series-a", "series-b", etc.
  location?: string
  logo_url?: string
  batch?: string // YC batch (e.g., "Winter 2024", "Summer 2024")
  created_at: string
  updated_at: string
  // Computed fields (from ranking algorithm)
  global_rank?: number
  elo_rating?: number
  market_price?: number // Current price in virtual currency
}

export interface PairwiseComparison {
  id: string
  user_id: string
  startup_a_id: string
  startup_b_id: string
  chosen_startup_id: string // Which one the user picked
  created_at: string
}

export interface Holding {
  id: string
  user_id: string
  startup_id: string
  quantity: number // Number of "shares" or units (negative = short position, positive = long position)
  average_cost: number // Entry price (always positive, represents price when position was opened)
  created_at: string
  updated_at: string
}

export interface Trade {
  id: string
  user_id: string
  startup_id: string
  trade_type: 'buy' | 'sell' | 'bet_down' | 'cover'
  quantity: number // Always positive, direction indicated by trade_type
  price: number // Price per unit at time of trade
  total_value: number // quantity * price
  created_at: string
}

export interface UserStats {
  user_id: string
  total_comparisons: number
  portfolio_value: number
  total_return: number // Percentage gain/loss
  alpha_score?: number // Performance vs market
  consistency_score?: number // How often their picks align with community
}

