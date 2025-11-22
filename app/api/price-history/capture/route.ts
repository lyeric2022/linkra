/**
 * API Route: /api/price-history/capture
 * Captures 5-minute snapshots of all startup prices
 * Should be called by a cron job every 5 minutes
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
    // Verify the request is from Vercel Cron or has the correct secret
    // Vercel Cron sends a special header: x-vercel-cron-signature or uses the CRON_SECRET
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    const vercelCronHeader = request.headers.get('x-vercel-signature')

    // Allow if it's from Vercel Cron (has vercel signature) OR has correct auth header
    const isVercelCron = !!vercelCronHeader
    const hasValidAuth = cronSecret && authHeader === `Bearer ${cronSecret}`

    if (cronSecret && !isVercelCron && !hasValidAuth) {
      console.warn('⚠️  [PRICE-HISTORY] Unauthorized request attempt')
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getSupabaseClient()

    // Get all startups with their current Elo ratings
    // Fetch ALL startups by using a large limit or pagination
    // Supabase default limit is 1000, so we need to handle more
    let allStartups: { id: string; elo_rating: number | null }[] = []
    let page = 0
    const pageSize = 1000
    let hasMore = true

    while (hasMore) {
      const { data: startups, error: startupsError } = await supabase
        .from('startups')
        .select('id, elo_rating')
        .range(page * pageSize, (page + 1) * pageSize - 1)

      if (startupsError) {
        console.error('❌ [PRICE-HISTORY] Error fetching startups:', startupsError)
        return Response.json({ error: 'Failed to fetch startups' }, { status: 500 })
      }

      if (!startups || startups.length === 0) {
        hasMore = false
      } else {
        allStartups = allStartups.concat(startups)
        hasMore = startups.length === pageSize
        page++
      }
    }

    if (allStartups.length === 0) {
      return Response.json({ message: 'No startups found' }, { status: 200 })
    }

    console.log(`📊 [PRICE-HISTORY] Fetched ${allStartups.length} startups total`)

    // Get current 5-minute interval timestamp (rounded to nearest 5 minutes)
    const now = new Date()
    const minutes = Math.floor(now.getMinutes() / 5) * 5
    const intervalTimestamp = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      now.getHours(),
      minutes,
      0,
      0
    )
    const intervalTimestampISO = intervalTimestamp.toISOString()

    // Prepare price history records
    const priceHistoryRecords = allStartups
      .filter((startup) => startup.elo_rating !== null && startup.elo_rating !== undefined)
      .map((startup) => ({
        startup_id: startup.id,
        elo_rating: startup.elo_rating!,
        price: calculatePrice(startup.elo_rating!),
        recorded_at: new Date().toISOString(), // Actual timestamp
        interval_timestamp: intervalTimestampISO, // 5-minute-truncated timestamp for uniqueness
      }))

    if (priceHistoryRecords.length === 0) {
      return Response.json({ message: 'No startups with Elo ratings found' }, { status: 200 })
    }

    // Insert price history records in batches to avoid hitting Supabase limits
    // Supabase can handle large inserts, but batching is safer for very large datasets
    const batchSize = 1000
    let totalInserted = 0
    let duplicatesSkipped = 0

    for (let i = 0; i < priceHistoryRecords.length; i += batchSize) {
      const batch = priceHistoryRecords.slice(i, i + batchSize)

      const { error: insertError } = await supabase
        .from('startup_price_history')
        .insert(batch)

      if (insertError && insertError.code !== '23505') {
        // Real error, not just duplicates
        console.error('❌ [PRICE-HISTORY] Error inserting price history batch:', insertError)
        return Response.json({ error: 'Failed to insert price history' }, { status: 500 })
      }

      if (insertError && insertError.code === '23505') {
        duplicatesSkipped += batch.length
      } else {
        totalInserted += batch.length
      }
    }

    if (duplicatesSkipped > 0) {
      console.log(`ℹ️  [PRICE-HISTORY] ${duplicatesSkipped} records already existed for this interval (skipped)`)
    }

    console.log(`✅ [PRICE-HISTORY] Captured ${totalInserted} new price snapshots for interval ${intervalTimestamp.toISOString()}`)

    return Response.json({
      success: true,
      count: priceHistoryRecords.length,
      timestamp: intervalTimestamp.toISOString(),
    })
  } catch (error: any) {
    console.error('❌ [PRICE-HISTORY] Unexpected error:', error)
    return Response.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
