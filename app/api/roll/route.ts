import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Lazy initialization to avoid build-time errors
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables')
  }

  // Use service role key to bypass RLS for API operations
  return createClient(supabaseUrl, supabaseServiceKey)
}

/**
 * POST /api/roll
 * User rolls for a random startup and gets 10 shares
 * Requires: userId in request body
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseClient()

    // Get user's current free_gifts_count
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('free_gifts_count')
      .eq('id', userId)
      .single()

    if (userError || !userData) {
      console.error('❌ [ROLL] Error fetching user:', userError)
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if user has free gifts remaining
    if (userData.free_gifts_count <= 0) {
      return NextResponse.json(
        { error: 'No free gifts remaining' },
        { status: 400 }
      )
    }

    // Get a random startup
    const { count: totalCount } = await supabase
      .from('startups')
      .select('*', { count: 'exact', head: true })

    if (!totalCount || totalCount === 0) {
      return NextResponse.json(
        { error: 'No startups available' },
        { status: 404 }
      )
    }

    const randomOffset = Math.floor(Math.random() * totalCount)
    const { data: randomStartup, error: startupError } = await supabase
      .from('startups')
      .select('*')
      .range(randomOffset, randomOffset)
      .limit(1)
      .single()

    if (startupError || !randomStartup) {
      console.error('❌ [ROLL] Error fetching random startup:', startupError)
      return NextResponse.json(
        { error: 'Failed to get random startup' },
        { status: 500 }
      )
    }

    // Check if user already has holdings for this startup
    const { data: existingHolding } = await supabase
      .from('holdings')
      .select('quantity, average_cost')
      .eq('user_id', userId)
      .eq('startup_id', randomStartup.id)
      .single()

    const sharesToAdd = 10
    const newQuantity = (existingHolding?.quantity || 0) + sharesToAdd

    // Update or insert holding
    // For free gifts, we want to keep average_cost at 0 if it's a new holding
    // If user already has shares, recalculate average cost weighted by quantity
    let newAverageCost = 0.00
    if (existingHolding && existingHolding.quantity > 0) {
      // Weighted average: (old_qty * old_avg + new_qty * new_avg) / total_qty
      const oldTotalCost = existingHolding.quantity * (existingHolding.average_cost || 0)
      const newTotalCost = sharesToAdd * 0.00 // Free gift has 0 cost
      newAverageCost = (oldTotalCost + newTotalCost) / newQuantity
    } else {
      // New holding, free gift has 0 cost
      newAverageCost = 0.00
    }

    const { error: holdingError } = await supabase
      .from('holdings')
      .upsert({
        user_id: userId,
        startup_id: randomStartup.id,
        quantity: newQuantity,
        average_cost: newAverageCost,
      }, {
        onConflict: 'user_id,startup_id'
      })

    if (holdingError) {
      console.error('❌ [ROLL] Error updating holdings:', holdingError)
      return NextResponse.json(
        { error: 'Failed to grant shares' },
        { status: 500 }
      )
    }

    // Decrement free_gifts_count
    const { error: updateError } = await supabase
      .from('users')
      .update({ free_gifts_count: userData.free_gifts_count - 1 })
      .eq('id', userId)

    if (updateError) {
      console.error('❌ [ROLL] Error updating free_gifts_count:', updateError)
      return NextResponse.json(
        { error: 'Failed to update gift count' },
        { status: 500 }
      )
    }

    console.log(`✅ [ROLL] User ${userId.substring(0, 8)}... rolled and got ${sharesToAdd} shares of ${randomStartup.name}`)

    return NextResponse.json({
      success: true,
      startup: {
        id: randomStartup.id,
        name: randomStartup.name,
      },
      shares: sharesToAdd,
      remainingGifts: userData.free_gifts_count - 1,
    })
  } catch (error: any) {
    console.error('❌ [ROLL] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to process roll' },
      { status: 500 }
    )
  }
}

