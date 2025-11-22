/**
 * API Route: /api/price-history/capture
 * Captures hourly snapshots of all startup prices
 * Should be called by a cron job every hour
 */

import { createClient } from '@supabase/supabase-js'
import { calculatePrice } from '@/lib/utils/price'

// Lazy initialization to avoid build-time errors
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient(supabaseUrl, supabaseServiceKey)
}

export async function POST(request: Request) {
  try {
    // Only allow this endpoint to be called with a secret key or from cron
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getSupabaseClient()

    // Get all startups with their current Elo ratings
    const { data: startups, error: startupsError } = await supabase
      .from('startups')
      .select('id, elo_rating')

    if (startupsError) {
      console.error('❌ [PRICE-HISTORY] Error fetching startups:', startupsError)
      return Response.json({ error: 'Failed to fetch startups' }, { status: 500 })
    }

    if (!startups || startups.length === 0) {
      return Response.json({ message: 'No startups found' }, { status: 200 })
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
      return Response.json({ message: 'No startups with Elo ratings found' }, { status: 200 })
    }

    // Insert price history records
    // Try insert, ignore duplicate errors (23505 = unique violation means record already exists for this hour)
    const { error: insertError } = await supabase
      .from('startup_price_history')
      .insert(priceHistoryRecords)

    if (insertError && insertError.code !== '23505') { // 23505 = unique violation (expected if already exists)
      console.error('❌ [PRICE-HISTORY] Error inserting price history:', insertError)
      return Response.json({ error: 'Failed to insert price history' }, { status: 500 })
    }

    if (insertError && insertError.code === '23505') {
      console.log('ℹ️  [PRICE-HISTORY] Some records already exist for this hour (skipping duplicates)')
    }

    console.log(`✅ [PRICE-HISTORY] Captured ${priceHistoryRecords.length} price snapshots for hour ${currentHour.toISOString()}`)

    return Response.json({
      success: true,
      count: priceHistoryRecords.length,
      timestamp: currentHour.toISOString(),
    })
  } catch (error: any) {
    console.error('❌ [PRICE-HISTORY] Unexpected error:', error)
    return Response.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
