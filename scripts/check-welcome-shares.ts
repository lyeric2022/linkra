/**
 * Diagnostic script to check why welcome shares weren't granted
 * Run with: bun run check-welcome-shares
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing required environment variables')
  console.error('Need: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkWelcomeShares() {
  console.log('🔍 Checking welcome shares setup...\n')

  try {
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.log('⚠️  Not authenticated. Please sign in first.')
      console.log('   Run this script after signing in, or check your session.')
      return
    }

    console.log(`✅ Authenticated as: ${user.email}\n`)

    // Check if user record exists
    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (userError || !userRecord) {
      console.log('❌ User record not found in public.users table')
      console.log('   This might be why shares weren\'t granted.')
      return
    }

    console.log('✅ User record exists')
    console.log(`   Currency: $${userRecord.virtual_currency}\n`)

    // Check holdings
    const { data: holdings, error: holdingsError } = await supabase
      .from('holdings')
      .select('*, startups(name)')
      .eq('user_id', user.id)

    if (holdingsError) {
      console.error('❌ Error fetching holdings:', holdingsError)
      return
    }

    if (!holdings || holdings.length === 0) {
      console.log('❌ No holdings found!')
      console.log('   This confirms shares were not granted.\n')
    } else {
      console.log(`✅ Found ${holdings.length} holdings:`)
      holdings.forEach((h: any) => {
        console.log(`   - ${h.startups?.name || 'Unknown'}: ${h.quantity} shares`)
      })
      console.log('')
    }

    // Check if startups exist
    const { data: startups, error: startupsError } = await supabase
      .from('startups')
      .select('id, name')
      .limit(10)

    if (startupsError) {
      console.error('❌ Error fetching startups:', startupsError)
      return
    }

    if (!startups || startups.length === 0) {
      console.log('❌ No startups found in database!')
      console.log('   This is why shares weren\'t granted.')
      console.log('   Run: bun run seed')
      return
    }

    console.log(`✅ Found ${startups.length} startups in database`)
    if (startups.length < 5) {
      console.log(`   ⚠️  Only ${startups.length} startups (need at least 5 for full gift)`)
    }
    console.log('')

    // Check if functions exist (requires service role key)
    console.log('💡 Possible reasons shares weren\'t granted:')
    console.log('   1. Database functions not updated yet')
    console.log('      → Run supabase/grant-welcome-shares.sql in Supabase SQL Editor')
    console.log('   2. User already existed before trigger was updated')
    console.log('      → Run: bun run grant-shares')
    console.log('   3. No startups in database when user signed up')
    console.log('      → Run: bun run seed, then bun run grant-shares')
    console.log('')

    if (!holdings || holdings.length === 0) {
      console.log('🔧 To fix: Run `bun run grant-shares` to grant shares now')
    }
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

checkWelcomeShares()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  })

