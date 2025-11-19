/**
 * API Route: /api/price-history/[startupId]
 * Fetches price history for a specific startup
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET(
  request: Request,
  { params }: { params: Promise<{ startupId: string }> }
) {
  try {
    const { startupId } = await params

    if (!startupId) {
      return Response.json({ error: 'Startup ID required' }, { status: 400 })
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // Get price history for the last 7 days (168 hours)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { data: priceHistory, error } = await supabase
      .from('startup_price_history')
      .select('*')
      .eq('startup_id', startupId)
      .gte('recorded_at', sevenDaysAgo.toISOString())
      .order('recorded_at', { ascending: true })

    if (error) {
      console.error('❌ [PRICE-HISTORY] Error fetching price history:', error)
      return Response.json({ error: 'Failed to fetch price history' }, { status: 500 })
    }

    return Response.json({
      success: true,
      data: priceHistory || [],
    })
  } catch (error: any) {
    console.error('❌ [PRICE-HISTORY] Unexpected error:', error)
    return Response.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

