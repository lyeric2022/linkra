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

    // Get time range from query parameters (default: 1 day)
    const url = new URL(request.url)
    const rangeParam = url.searchParams.get('range') || '1d'

    // Calculate time range
    const now = new Date()
    let startTime: Date

    switch (rangeParam) {
      case '30m':
        startTime = new Date(now.getTime() - 30 * 60 * 1000)
        break
      case '1h':
        startTime = new Date(now.getTime() - 60 * 60 * 1000)
        break
      case '6h':
        startTime = new Date(now.getTime() - 6 * 60 * 60 * 1000)
        break
      case '1d':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
      case '1w':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      default:
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000) // Default to 1 day
    }

    const { data: priceHistory, error } = await supabase
      .from('startup_price_history')
      .select('*')
      .eq('startup_id', startupId)
      .gte('recorded_at', startTime.toISOString())
      .order('recorded_at', { ascending: true })

    if (error) {
      console.error('❌ [PRICE-HISTORY] Error fetching price history:', error)
      return Response.json({ error: 'Failed to fetch price history' }, { status: 500 })
    }

    return Response.json({
      success: true,
      data: priceHistory || [],
      range: rangeParam,
    })
  } catch (error: any) {
    console.error('❌ [PRICE-HISTORY] Unexpected error:', error)
    return Response.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
