/**
 * Script to reset the database (clear all data)
 * WARNING: This will DELETE ALL DATA from all tables!
 * 
 * Run with: bun run reset-db
 * 
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as readline from 'readline'

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

function askQuestion(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      rl.close()
      resolve(answer)
    })
  })
}

async function getTableCounts() {
  const tables = ['users', 'startups', 'pairwise_comparisons', 'holdings', 'trades']
  const counts: Record<string, number> = {}

  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })

    if (error) {
      console.error(`❌ Error counting ${table}:`, error)
      counts[table] = -1
    } else {
      counts[table] = count || 0
    }
  }

  return counts
}

async function resetDatabase() {
  console.log('⚠️  WARNING: This will DELETE ALL DATA from the database!')
  console.log('   This includes:')
  console.log('   - All users')
  console.log('   - All startups')
  console.log('   - All comparisons')
  console.log('   - All holdings')
  console.log('   - All trades')
  console.log('')
  console.log('   This action CANNOT be undone!\n')

  const answer = await askQuestion('Type "RESET" to confirm: ')

  if (answer !== 'RESET') {
    console.log('❌ Reset cancelled')
    process.exit(0)
  }

  console.log('\n📊 Current data counts:')
  const beforeCounts = await getTableCounts()
  for (const [table, count] of Object.entries(beforeCounts)) {
    console.log(`   ${table}: ${count} rows`)
  }

  console.log('\n🗑️  Deleting all data...')

  try {
    // Delete in order to respect foreign key constraints
    const deleteOrder = [
      { table: 'trades', name: 'Trades' },
      { table: 'holdings', name: 'Holdings' },
      { table: 'pairwise_comparisons', name: 'Comparisons' },
      { table: 'startups', name: 'Startups' },
      { table: 'users', name: 'Users' },
    ]

    for (const { table, name } of deleteOrder) {
      const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000')
      
      if (error) {
        console.error(`❌ Error deleting ${name}:`, error)
        throw error
      }
      console.log(`   ✅ Deleted all ${name}`)
    }

    console.log('\n✨ Database reset complete!\n')

    console.log('📊 Final data counts:')
    const afterCounts = await getTableCounts()
    for (const [table, count] of Object.entries(afterCounts)) {
      console.log(`   ${table}: ${count} rows`)
    }

    console.log('\n💡 Next steps:')
    console.log('   1. Run `bun run seed` to populate startups')
    console.log('   2. Sign up new users to test the app')
  } catch (error) {
    console.error('❌ Error resetting database:', error)
    process.exit(1)
  }
}

resetDatabase()
  .then(() => {
    console.log('\n✅ Script completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  })

