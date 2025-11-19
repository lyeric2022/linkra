/**
 * Database migration checker
 * Checks if tables exist and provides helpful error messages
 * Can be called on server startup
 */

import { createClient } from '@supabase/supabase-js'

// Lazy initialization to avoid build-time errors
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient(supabaseUrl, supabaseServiceKey)
}

export async function checkDatabaseSetup() {
  const supabase = getSupabaseClient()
  const requiredTables = ['users', 'startups', 'pairwise_comparisons', 'holdings', 'trades']
  const missingTables: string[] = []

  for (const table of requiredTables) {
    const { error } = await supabase
      .from(table)
      .select('*')
      .limit(1)
    
    if (error && error.code === 'PGRST205') {
      missingTables.push(table)
    }
  }

  if (missingTables.length > 0) {
    console.error('\n❌ Database tables are missing!')
    console.error(`   Missing tables: ${missingTables.join(', ')}`)
    console.error('\n📝 To fix this:')
    console.error('   1. Go to Supabase Dashboard → SQL Editor')
    console.error('   2. Copy and run the SQL from: supabase/schema.sql')
    console.error('   3. Restart the server\n')
    return false
  }

  return true
}

