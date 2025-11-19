/**
 * Script to capture hourly price history snapshots
 * Run this script every hour via cron or scheduled job
 * 
 * Usage:
 *   bun run capture-price-history
 * 
 * Or set up a cron job:
 *   0 * * * * cd /path/to/linkra && bun run capture-price-history
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { calculatePrice } from '../lib/utils/price'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables')
  process.exit(1)
}

async function capturePriceHistory() {
  console.log('🔄 [PRICE-HISTORY] Starting price history capture...')
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    // Get all startups with their current Elo ratings
    const { data: startups, error: startupsError } = await supabase
      .from('startups')
      .select('id, elo_rating')

    if (startupsError) {
      throw new Error(`Failed to fetch startups: ${startupsError.message}`)
    }

    if (!startups || startups.length === 0) {
      console.log('⚠️  [PRICE-HISTORY] No startups found')
      return
    }

    // Get current hour timestamp (rounded to hour)
    const now = new Date()
    const currentHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), 0, 0, 0)
    const hourTimestamp = currentHour.toISOString()

    // Prepare price history records
    const priceHistoryRecords = startups
      .filter(startup => startup.elo_rating !== null && startup.elo_rating !== undefined)
      .map(startup => ({
        startup_id: startup.id,
        elo_rating: startup.elo_rating,
        price: calculatePrice(startup.elo_rating),
        recorded_at: new Date().toISOString(), // Actual timestamp
        hour_timestamp: hourTimestamp, // Hour-truncated timestamp for uniqueness
      }))

    if (priceHistoryRecords.length === 0) {
      console.log('⚠️  [PRICE-HISTORY] No startups with Elo ratings found')
      return
    }

    // Insert price history records
    // Try insert, ignore duplicate errors (23505 = unique violation)
    const { error: insertError } = await supabase
      .from('startup_price_history')
      .insert(priceHistoryRecords)

    if (insertError && insertError.code !== '23505') { // 23505 = unique violation (expected if already exists)
      throw new Error(`Failed to insert price history: ${insertError.message}`)
    }
    
    if (insertError && insertError.code === '23505') {
      console.log('ℹ️  [PRICE-HISTORY] Some records already exist for this hour (skipping duplicates)')
    }

    console.log(`✅ [PRICE-HISTORY] Captured ${priceHistoryRecords.length} price snapshots for hour ${currentHour.toISOString()}`)
  } catch (error: any) {
    console.error('❌ [PRICE-HISTORY] Error:', error.message)
    process.exit(1)
  }
}

capturePriceHistory()

