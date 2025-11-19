import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * Get statistics about votes/comparisons and rankings
 */
export async function GET() {
  try {
    // Count total comparisons
    const { count: comparisonCount, error: compError } = await supabase
      .from('pairwise_comparisons')
      .select('*', { count: 'exact', head: true })

    // Count unique users who voted
    const { count: userCount, error: userError } = await supabase
      .from('pairwise_comparisons')
      .select('user_id', { count: 'exact', head: true })

    // Count startups with rankings
    const { count: rankedCount, error: rankedError } = await supabase
      .from('startups')
      .select('global_rank', { count: 'exact', head: true })
      .not('global_rank', 'is', null)

    // Get latest comparison timestamp
    const { data: latestComp, error: latestError } = await supabase
      .from('pairwise_comparisons')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    // Get startups with most comparisons
    // Wrap in try/catch in case RPC function doesn't exist
    let topStartups = null
    let topError = null
    try {
      const result = await supabase
      .rpc('get_startup_comparison_counts')
      .limit(10)
      topStartups = result.data
      topError = result.error
    } catch (err) {
        // If RPC doesn't exist, return empty
      topStartups = null
      topError = null
    }

    return NextResponse.json({
      comparisons: {
        total: comparisonCount || 0,
        uniqueUsers: userCount || 0,
        latest: latestComp?.created_at || null,
      },
      rankings: {
        rankedStartups: rankedCount || 0,
        lastUpdated: null, // Would need to track this separately
      },
      topStartups: topStartups || [],
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to get stats' },
      { status: 500 }
    )
  }
}

