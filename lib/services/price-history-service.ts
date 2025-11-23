/**
 * Price History Background Service
 * Automatically captures price snapshots every 5 minutes
 * Runs as a background interval within the Next.js app
 */

import { createClient } from '@supabase/supabase-js'
import { calculatePrice } from '@/lib/utils/price'

class PriceHistoryService {
  private intervalId: NodeJS.Timeout | null = null
  private isRunning = false
  private captureInterval = 5 * 60 * 1000 // 5 minutes in milliseconds
  private supabaseUrl: string
  private supabaseServiceKey: string

  constructor() {
    this.supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    this.supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  }

  /**
   * Start the background service
   */
  start() {
    // Only run in production or if explicitly enabled
    const shouldRun = process.env.NODE_ENV === 'production' || process.env.ENABLE_PRICE_HISTORY_SERVICE === 'true'

    if (!shouldRun) {
      console.log('⏸️  [PRICE-HISTORY-SERVICE] Disabled (not in production)')
      return
    }

    if (this.isRunning) {
      console.log('⚠️  [PRICE-HISTORY-SERVICE] Already running')
      return
    }

    if (!this.supabaseUrl || !this.supabaseServiceKey) {
      console.error('❌ [PRICE-HISTORY-SERVICE] Missing Supabase credentials')
      return
    }

    console.log('🚀 [PRICE-HISTORY-SERVICE] Starting background service...')
    console.log(`   Interval: Every 5 minutes`)

    this.isRunning = true

    // Run immediately on startup
    this.captureSnapshot().catch(err => {
      console.error('❌ [PRICE-HISTORY-SERVICE] Initial capture failed:', err.message)
    })

    // Then run every 5 minutes
    this.intervalId = setInterval(() => {
      this.captureSnapshot().catch(err => {
        console.error('❌ [PRICE-HISTORY-SERVICE] Scheduled capture failed:', err.message)
      })
    }, this.captureInterval)

    console.log('✅ [PRICE-HISTORY-SERVICE] Background service started')
  }

  /**
   * Stop the background service
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
      this.isRunning = false
      console.log('🛑 [PRICE-HISTORY-SERVICE] Background service stopped')
    }
  }

  /**
   * Capture a price snapshot for all startups
   */
  private async captureSnapshot() {
    const startTime = Date.now()
    console.log(`\n🔄 [PRICE-HISTORY-SERVICE] Starting capture at ${new Date().toISOString()}`)

    const supabase = createClient(this.supabaseUrl, this.supabaseServiceKey)

    try {
      // Fetch all startups with pagination
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
          throw new Error(`Failed to fetch startups: ${startupsError.message}`)
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
        console.log('⚠️  [PRICE-HISTORY-SERVICE] No startups found')
        return
      }

      console.log(`   Fetched ${allStartups.length} startups`)

      // Get current 5-minute interval timestamp
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
          recorded_at: new Date().toISOString(),
          interval_timestamp: intervalTimestampISO,
        }))

      if (priceHistoryRecords.length === 0) {
        console.log('⚠️  [PRICE-HISTORY-SERVICE] No startups with Elo ratings')
        return
      }

      console.log(`   Prepared ${priceHistoryRecords.length} records`)

      // Insert in batches
      const batchSize = 1000
      let totalInserted = 0
      let duplicatesSkipped = 0

      for (let i = 0; i < priceHistoryRecords.length; i += batchSize) {
        const batch = priceHistoryRecords.slice(i, i + batchSize)

        const { error: insertError } = await supabase
          .from('startup_price_history')
          .insert(batch)

        if (insertError && insertError.code !== '23505') {
          throw new Error(`Failed to insert batch: ${insertError.message}`)
        }

        if (insertError && insertError.code === '23505') {
          duplicatesSkipped += batch.length
        } else {
          totalInserted += batch.length
        }
      }

      const elapsed = Date.now() - startTime
      console.log(`✅ [PRICE-HISTORY-SERVICE] Capture complete in ${elapsed}ms`)
      console.log(`   - New records: ${totalInserted}`)
      if (duplicatesSkipped > 0) {
        console.log(`   - Duplicates skipped: ${duplicatesSkipped}`)
      }
      console.log(`   - Interval: ${intervalTimestampISO}`)

    } catch (error: any) {
      console.error('❌ [PRICE-HISTORY-SERVICE] Capture failed:', error.message)
      throw error
    }
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      running: this.isRunning,
      interval: this.captureInterval,
      intervalMinutes: this.captureInterval / 1000 / 60,
    }
  }
}

// Create singleton instance
export const priceHistoryService = new PriceHistoryService()
