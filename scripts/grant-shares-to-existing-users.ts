/**
 * Script to grant welcome shares to existing users who don't have any holdings yet
 * Run with: bun run scripts/grant-shares-to-existing-users.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables')
  console.error('Need: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function grantSharesToExistingUsers() {
  console.log('🚀 Starting to grant welcome shares to existing users...\n')

  try {
    // Get all users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email')

    if (usersError) {
      console.error('❌ Error fetching users:', usersError)
      return
    }

    if (!users || users.length === 0) {
      console.log('ℹ️  No users found')
      return
    }

    console.log(`📊 Found ${users.length} users\n`)

    // Get all startups
    const { data: startups, error: startupsError } = await supabase
      .from('startups')
      .select('id')

    if (startupsError) {
      console.error('❌ Error fetching startups:', startupsError)
      return
    }

    if (!startups || startups.length === 0) {
      console.log('❌ No startups found. Cannot grant shares.')
      return
    }

    if (startups.length < 5) {
      console.log(`⚠️  Only ${startups.length} startups available (need at least 5)`)
    }

    console.log(`📈 Found ${startups.length} startups\n`)

    let grantedCount = 0
    let skippedCount = 0

    // For each user, check if they have holdings
    for (const user of users) {
      const { data: holdings, error: holdingsError } = await supabase
        .from('holdings')
        .select('id')
        .eq('user_id', user.id)
        .limit(1)

      if (holdingsError) {
        console.error(`❌ Error checking holdings for user ${user.email}:`, holdingsError)
        continue
      }

      // If user already has holdings, skip
      if (holdings && holdings.length > 0) {
        skippedCount++
        continue
      }

      // Select 5 random startups
      const shuffled = [...startups].sort(() => Math.random() - 0.5)
      const selectedStartups = shuffled.slice(0, Math.min(5, shuffled.length))

      // Grant 10 shares in each startup
      for (const startup of selectedStartups) {
        const { error: insertError } = await supabase
          .from('holdings')
          .insert({
            user_id: user.id,
            startup_id: startup.id,
            quantity: 10,
            average_cost: 0.00, // Gift shares have 0 cost
          })

        if (insertError) {
          // Ignore conflict errors (user might have gotten shares between check and insert)
          if (insertError.code !== '23505') {
            console.error(`❌ Error granting shares to ${user.email}:`, insertError)
          }
        }
      }

      grantedCount++
      console.log(`✅ Granted shares to ${user.email}`)
    }

    console.log(`\n✨ Complete!`)
    console.log(`   Granted shares: ${grantedCount} users`)
    console.log(`   Skipped (already have holdings): ${skippedCount} users`)
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

grantSharesToExistingUsers()
  .then(() => {
    console.log('\n✅ Script completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  })

