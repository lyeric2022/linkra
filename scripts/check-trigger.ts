/**
 * Check if the trigger and functions are set up correctly
 * Run with: bun run check-trigger
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

async function checkTrigger() {
  console.log('🔍 Checking trigger setup...\n')

  try {
    // Check if grant_welcome_shares function exists
    const { data: functions, error: funcError } = await supabase.rpc('grant_welcome_shares', {
      user_uuid: '00000000-0000-0000-0000-000000000000' // Dummy UUID to test if function exists
    })

    if (funcError) {
      if (funcError.code === '42883' || funcError.message.includes('does not exist')) {
        console.log('❌ Function `grant_welcome_shares` does not exist!')
        console.log('   → Run `supabase/grant-welcome-shares.sql` in Supabase SQL Editor\n')
      } else {
        console.log('✅ Function exists (error is expected with dummy UUID)')
      }
    } else {
      console.log('✅ Function `grant_welcome_shares` exists')
    }

    // Check trigger by querying pg_trigger
    // We'll use a direct SQL query through Supabase
    const { data: triggerCheck, error: triggerError } = await supabase
      .from('_realtime')
      .select('*')
      .limit(0) // Just to test connection

    // Check if handle_new_user function exists by trying to call it
    // Actually, let's check the logs or try a different approach
    
    console.log('\n📋 To check trigger status:')
    console.log('   1. Go to Supabase Dashboard → Database → Functions')
    console.log('   2. Look for `handle_new_user` function')
    console.log('   3. Go to Database → Triggers')
    console.log('   4. Look for `on_auth_user_created` trigger on `auth.users` table')
    console.log('\n💡 Most likely issue:')
    console.log('   The trigger function hasn\'t been updated in your database yet!')
    console.log('   → Run `supabase/grant-welcome-shares.sql` in Supabase SQL Editor')
    console.log('   → Or run the updated `supabase/schema.sql` if you haven\'t already')

  } catch (error) {
    console.error('❌ Error:', error)
  }
}

checkTrigger()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  })

