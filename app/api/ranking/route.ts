import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// This is a server-side API route that runs the ranking algorithm
// In production, you'd want to run this as a cron job or background worker

// Lazy initialization to avoid build-time errors
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient(supabaseUrl, supabaseServiceKey)
}

// Elo rating system for pairwise comparisons
// Based on Bradley-Terry model principles
const K_FACTOR = 32 // How much ratings change per comparison
const INITIAL_RATING = 1500

function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400))
}

function updateElo(ratingA: number, ratingB: number, aWon: boolean): [number, number] {
  const expectedA = expectedScore(ratingA, ratingB)
  const expectedB = 1 - expectedA

  const actualA = aWon ? 1 : 0
  const actualB = 1 - actualA

  const newRatingA = ratingA + K_FACTOR * (actualA - expectedA)
  const newRatingB = ratingB + K_FACTOR * (actualB - expectedB)

  return [newRatingA, newRatingB]
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  console.log('🚀 [RANKING] Starting ranking algorithm...')

  try {
    const supabaseAdmin = getSupabaseAdmin()

    // Get all startups
    console.log('📊 [RANKING] Fetching startups...')
    const { data: startups, error: startupsError } = await supabaseAdmin
      .from('startups')
      .select('id, elo_rating')

    if (startupsError) {
      console.error('❌ [RANKING] Error fetching startups:', startupsError)
      throw startupsError
    }

    console.log(`✅ [RANKING] Found ${startups?.length || 0} startups`)

    // Initialize ratings if needed
    const ratings = new Map<string, number>()
    startups.forEach(startup => {
      ratings.set(startup.id, startup.elo_rating || INITIAL_RATING)
    })

    // Get all pairwise comparisons
    console.log('📊 [RANKING] Fetching pairwise comparisons...')
    const { data: comparisons, error: comparisonsError } = await supabaseAdmin
      .from('pairwise_comparisons')
      .select('startup_a_id, startup_b_id, chosen_startup_id')

    if (comparisonsError) {
      console.error('❌ [RANKING] Error fetching comparisons:', comparisonsError)
      throw comparisonsError
    }

    console.log(`✅ [RANKING] Found ${comparisons?.length || 0} comparisons`)

    if (!comparisons || comparisons.length === 0) {
      console.log('⚠️  [RANKING] No comparisons found. Rankings unchanged.')
      return NextResponse.json({
        success: true,
        message: 'No comparisons to process',
        processedComparisons: 0,
      })
    }

    // Process comparisons to update ratings
    console.log('🔄 [RANKING] Processing comparisons (3 passes)...')
    for (let pass = 0; pass < 3; pass++) {
      console.log(`   Pass ${pass + 1}/3...`)
      comparisons.forEach((comp, idx) => {
        const ratingA = ratings.get(comp.startup_a_id) || INITIAL_RATING
        const ratingB = ratings.get(comp.startup_b_id) || INITIAL_RATING
        const aWon = comp.chosen_startup_id === comp.startup_a_id

        const [newRatingA, newRatingB] = updateElo(ratingA, ratingB, aWon)
        ratings.set(comp.startup_a_id, newRatingA)
        ratings.set(comp.startup_b_id, newRatingB)

        if (idx < 3) { // Log first 3 for debugging
          console.log(`   [RANKING] Comp ${idx + 1}: Startup A (${ratingA.toFixed(1)} → ${newRatingA.toFixed(1)}) vs Startup B (${ratingB.toFixed(1)} → ${newRatingB.toFixed(1)})`)
        }
      })
    }

    // Update startup ratings in database
    console.log('💾 [RANKING] Updating Elo ratings in database...')
    const updates = Array.from(ratings.entries()).map(([startupId, rating]) => ({
      id: startupId,
      elo_rating: rating,
    }))

    let updatedCount = 0
    for (const update of updates) {
      const { error } = await supabaseAdmin
        .from('startups')
        .update({ elo_rating: update.elo_rating })
        .eq('id', update.id)

      if (error) {
        console.error(`❌ [RANKING] Error updating startup ${update.id}:`, error)
      } else {
        updatedCount++
      }
    }
    console.log(`✅ [RANKING] Updated ${updatedCount}/${updates.length} Elo ratings`)

    // Calculate global rankings based on Elo ratings
    console.log('📈 [RANKING] Calculating global rankings...')
    const sortedStartups = Array.from(ratings.entries())
      .sort((a, b) => b[1] - a[1]) // Sort by rating descending

    // Log top 5 rankings
    console.log('🏆 [RANKING] Top 5 rankings:')
    sortedStartups.slice(0, 5).forEach(([startupId, rating], idx) => {
      const startup = startups.find(s => s.id === startupId)
      console.log(`   ${idx + 1}. Startup ${startupId.substring(0, 8)}... (Rating: ${rating.toFixed(1)})`)
    })

    // Update ranks
    let rankedCount = 0
    for (let i = 0; i < sortedStartups.length; i++) {
      const [startupId] = sortedStartups[i]
      const { error } = await supabaseAdmin
        .from('startups')
        .update({ global_rank: i + 1 })
        .eq('id', startupId)

      if (error) {
        console.error(`❌ [RANKING] Error updating rank for startup ${startupId}:`, error)
      } else {
        rankedCount++
      }
    }
    console.log(`✅ [RANKING] Updated ${rankedCount}/${sortedStartups.length} global ranks`)

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2)
    console.log(`✨ [RANKING] Complete! Processed ${comparisons.length} comparisons in ${elapsed}s`)

    return NextResponse.json({
      success: true,
      message: `Updated rankings for ${startups.length} startups`,
      processedComparisons: comparisons.length,
      elapsedSeconds: parseFloat(elapsed),
    })
  } catch (error: any) {
    console.error('Error updating rankings:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update rankings' },
      { status: 500 }
    )
  }
}

// GET endpoint to manually trigger ranking update (for testing)
export async function GET() {
  return NextResponse.json({
    message: 'Use POST to trigger ranking update',
    note: 'In production, run this as a scheduled job (cron)',
  })
}
