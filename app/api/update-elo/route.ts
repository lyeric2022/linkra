import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Lazy initialization to avoid build-time errors
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient(supabaseUrl, supabaseServiceKey)
}

// Elo rating system - same as ranking algorithm
const K_FACTOR = 32
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

/**
 * POST /api/update-elo
 * Updates ELO ratings for specific startups using multi-pass algorithm
 * More accurate than single real-time update, faster than full ranking recalculation
 *
 * Body: { startupIds: string[] }
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const { startupIds } = await request.json()

    if (!startupIds || !Array.isArray(startupIds) || startupIds.length === 0) {
      return NextResponse.json(
        { error: 'startupIds array is required' },
        { status: 400 }
      )
    }

    console.log(`🔄 [UPDATE-ELO] Updating ELO for ${startupIds.length} startups`)

    const supabaseAdmin = getSupabaseAdmin()

    // Get current ratings for these startups
    const { data: startups, error: startupsError } = await supabaseAdmin
      .from('startups')
      .select('id, elo_rating')
      .in('id', startupIds)

    if (startupsError) {
      console.error('❌ [UPDATE-ELO] Error fetching startups:', startupsError)
      throw startupsError
    }

    if (!startups || startups.length === 0) {
      return NextResponse.json(
        { error: 'No startups found with provided IDs' },
        { status: 404 }
      )
    }

    // Get all startups (we need all of them for accurate multi-pass calculation)
    const { data: allStartups, error: allStartupsError } = await supabaseAdmin
      .from('startups')
      .select('id, elo_rating')

    if (allStartupsError) {
      console.error('❌ [UPDATE-ELO] Error fetching all startups:', allStartupsError)
      throw allStartupsError
    }

    // Initialize ALL startup ratings (like ranking API does)
    const ratings = new Map<string, number>()
    allStartups.forEach(startup => {
      ratings.set(startup.id, startup.elo_rating || INITIAL_RATING)
    })

    // Get all comparisons involving the target startups
    const { data: comparisons, error: comparisonsError } = await supabaseAdmin
      .from('pairwise_comparisons')
      .select('startup_a_id, startup_b_id, chosen_startup_id')
      .or(`startup_a_id.in.(${startupIds.join(',')}),startup_b_id.in.(${startupIds.join(',')})`)

    if (comparisonsError) {
      console.error('❌ [UPDATE-ELO] Error fetching comparisons:', comparisonsError)
      throw comparisonsError
    }

    console.log(`📊 [UPDATE-ELO] Found ${comparisons?.length || 0} comparisons involving these startups`)

    if (!comparisons || comparisons.length === 0) {
      // No comparisons yet, keep initial ratings
      return NextResponse.json({
        success: true,
        message: 'No comparisons found, ratings unchanged',
        updatedStartups: startupIds.length,
      })
    }

    // Multi-pass algorithm (3 passes like the ranking API)
    console.log('🔄 [UPDATE-ELO] Processing comparisons (3 passes)...')
    for (let pass = 0; pass < 3; pass++) {
      comparisons.forEach((comp) => {
        const ratingA = ratings.get(comp.startup_a_id) || INITIAL_RATING
        const ratingB = ratings.get(comp.startup_b_id) || INITIAL_RATING
        const aWon = comp.chosen_startup_id === comp.startup_a_id

        const [newRatingA, newRatingB] = updateElo(ratingA, ratingB, aWon)

        // Update both ratings (not just target startups)
        // This ensures accurate calculations when one of the compared startups isn't in the target list
        ratings.set(comp.startup_a_id, newRatingA)
        ratings.set(comp.startup_b_id, newRatingB)
      })
    }

    // Update ratings in database (only for target startups)
    console.log('💾 [UPDATE-ELO] Updating ratings in database...')
    let updatedCount = 0
    const results: Record<string, number> = {}

    for (const startupId of startupIds) {
      const newRating = ratings.get(startupId)
      if (newRating !== undefined) {
        const { error } = await supabaseAdmin
          .from('startups')
          .update({ elo_rating: newRating })
          .eq('id', startupId)

        if (error) {
          console.error(`❌ [UPDATE-ELO] Error updating startup ${startupId}:`, error)
        } else {
          updatedCount++
          results[startupId] = newRating
        }
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2)
    console.log(`✅ [UPDATE-ELO] Updated ${updatedCount}/${startupIds.length} ratings in ${elapsed}s`)

    return NextResponse.json({
      success: true,
      message: `Updated ELO ratings for ${updatedCount} startups`,
      ratings: results,
      elapsedSeconds: parseFloat(elapsed),
    })
  } catch (error: any) {
    console.error('❌ [UPDATE-ELO] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update ELO ratings' },
      { status: 500 }
    )
  }
}
