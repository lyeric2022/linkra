/**
 * Fix missing user records
 * Creates public.users records for any auth.users that don't have them
 * 
 * Usage:
 *   bun run scripts/fix-users.ts
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixUsers() {
  console.log('🔍 Checking for missing user records...\n')

  try {
    // Get all auth users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    
    if (authError) {
      console.error('❌ Error fetching auth users:', authError.message)
      process.exit(1)
    }

    console.log(`📊 Found ${authUsers.users.length} auth users\n`)

    // Get all public users
    const { data: publicUsers, error: publicError } = await supabase
      .from('users')
      .select('id')

    if (publicError && publicError.code !== 'PGRST205') {
      console.error('❌ Error fetching public users:', publicError.message)
      process.exit(1)
    }

    const publicUserIds = new Set((publicUsers || []).map(u => u.id))
    const missingUsers = authUsers.users.filter(au => !publicUserIds.has(au.id))

    if (missingUsers.length === 0) {
      console.log('✅ All users have records in public.users table!')
      return
    }

    console.log(`⚠️  Found ${missingUsers.length} users missing from public.users table\n`)
    console.log('💾 Creating missing user records...\n')

    // Create missing user records
    let created = 0
    let errors = 0

    for (const authUser of missingUsers) {
      const { error } = await supabase
        .from('users')
        .insert({
          id: authUser.id,
          email: authUser.email || '',
          virtual_currency: 10000.00,
        })

      if (error) {
        console.error(`❌ Error creating user ${authUser.email}:`, error.message)
        errors++
      } else {
        console.log(`✅ Created record for: ${authUser.email}`)
        created++
      }
    }

    console.log(`\n✨ Done!`)
    console.log(`✅ Created: ${created} user records`)
    if (errors > 0) {
      console.log(`❌ Errors: ${errors}`)
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

fixUsers().catch(console.error)

