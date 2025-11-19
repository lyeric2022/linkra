/**
 * Check if Elo decreases are working correctly
 * Find startups that have lost comparisons and should have decreased ratings
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function checkEloDecreases() {
  console.log('🔍 Checking Elo decreases...\n')

  try {
    // Get all comparisons
    const { data: comparisons, error: compError } = await supabase
      .from('pairwise_comparisons')
      .select('startup_a_id, startup_b_id, chosen_startup_id')

    if (compError) {
      console.error('❌ Error fetching comparisons:', compError)
      return
    }

    console.log(`📊 Found ${comparisons?.length || 0} comparisons\n`)

    // Get all startups with their ratings
    const { data: startups, error: startupsError } = await supabase
      .from('startups')
      .select('id, name, elo_rating')

    if (startupsError) {
      console.error('❌ Error fetching startups:', startupsError)
      return
    }

    const startupMap = new Map(startups.map(s => [s.id, s]))

    // Find losers (startups that appeared in comparisons but weren't chosen)
    const losers = new Map<string, number>()
    const winners = new Map<string, number>()

    comparisons?.forEach(comp => {
      if (comp.chosen_startup_id === comp.startup_a_id) {
        // A won, B lost
        winners.set(comp.startup_a_id, (winners.get(comp.startup_a_id) || 0) + 1)
        losers.set(comp.startup_b_id, (losers.get(comp.startup_b_id) || 0) + 1)
      } else {
        // B won, A lost
        winners.set(comp.startup_b_id, (winners.get(comp.startup_b_id) || 0) + 1)
        losers.set(comp.startup_a_id, (losers.get(comp.startup_a_id) || 0) + 1)
      }
    })

    console.log('📉 Startups that LOST comparisons (should have decreased Elo):\n')
    let foundLosers = false
    for (const [startupId, lossCount] of losers.entries()) {
      const startup = startupMap.get(startupId)
      if (startup) {
        const elo = startup.elo_rating || 1500
        const status = elo < 1500 ? '✅ DECREASED' : elo === 1500 ? '⚠️  UNCHANGED' : '❌ INCREASED'
        console.log(`   ${startup.name}: ${elo.toFixed(0)} Elo (lost ${lossCount}x) ${status}`)
        foundLosers = true
      }
    }

    if (!foundLosers) {
      console.log('   (No startups found that lost)\n')
    } else {
      console.log('')
    }

    console.log('📈 Startups that WON comparisons:\n')
    for (const [startupId, winCount] of Array.from(winners.entries()).slice(0, 10)) {
      const startup = startupMap.get(startupId)
      if (startup) {
        const elo = startup.elo_rating || 1500
        console.log(`   ${startup.name}: ${elo.toFixed(0)} Elo (won ${winCount}x)`)
      }
    }

    // Check for startups below 1500
    const below1500 = startups.filter(s => (s.elo_rating || 1500) < 1500)
    console.log(`\n📊 Summary:`)
    console.log(`   Startups below 1500: ${below1500.length}`)
    console.log(`   Startups at exactly 1500: ${startups.filter(s => (s.elo_rating || 1500) === 1500).length}`)
    console.log(`   Startups above 1500: ${startups.filter(s => (s.elo_rating || 1500) > 1500).length}`)

    if (below1500.length > 0) {
      console.log(`\n✅ Found ${below1500.length} startups with decreased Elo:`)
      below1500.slice(0, 10).forEach(s => {
        console.log(`   ${s.name}: ${(s.elo_rating || 1500).toFixed(0)} Elo`)
      })
    } else {
      console.log(`\n⚠️  No startups found below 1500 Elo!`)
      console.log(`   This suggests the algorithm might not be decreasing ratings correctly.`)
    }

  } catch (error) {
    console.error('❌ Error:', error)
  }
}

checkEloDecreases()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  })

