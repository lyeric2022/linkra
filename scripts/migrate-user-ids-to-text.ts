import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function migrateUserIdsToText() {
  console.log('🔄 Starting migration: UUID -> TEXT for user IDs')
  console.log('⚠️  WARNING: This will modify your database schema!')
  console.log('📝 Make sure you have a backup before proceeding.')
  console.log('')

  // List of tables that reference users.id
  const tablesToUpdate = [
    'pairwise_comparisons',
    'portfolio_transactions',
    'startup_submissions',
    'gifts_given',
    'gifts_received',
  ]

  try {
    console.log('Step 1: Checking current users table schema...')
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id')
      .limit(1)

    if (usersError) {
      console.error('❌ Error checking users table:', usersError)
      process.exit(1)
    }

    console.log('✅ Users table accessible')
    console.log('')

    // SQL migration script
    const migrationSQL = `
-- Migration: Change user IDs from UUID to TEXT for Auth0 compatibility
-- This allows Auth0 user IDs like "google-oauth2|123456789" or "auth0|abc123"

BEGIN;

-- Step 1: Drop foreign key constraints that reference users.id
ALTER TABLE pairwise_comparisons DROP CONSTRAINT IF EXISTS pairwise_comparisons_user_id_fkey;
ALTER TABLE portfolio_transactions DROP CONSTRAINT IF EXISTS portfolio_transactions_user_id_fkey;
ALTER TABLE startup_submissions DROP CONSTRAINT IF EXISTS startup_submissions_user_id_fkey;
ALTER TABLE gifts_given DROP CONSTRAINT IF EXISTS gifts_given_giver_id_fkey;
ALTER TABLE gifts_received DROP CONSTRAINT IF EXISTS gifts_received_receiver_id_fkey;

-- Step 2: Change users.id from UUID to TEXT
ALTER TABLE users ALTER COLUMN id TYPE TEXT;

-- Step 3: Change foreign key columns from UUID to TEXT
ALTER TABLE pairwise_comparisons ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE portfolio_transactions ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE startup_submissions ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE gifts_given ALTER COLUMN giver_id TYPE TEXT;
ALTER TABLE gifts_received ALTER COLUMN receiver_id TYPE TEXT;

-- Step 4: Re-add foreign key constraints
ALTER TABLE pairwise_comparisons
  ADD CONSTRAINT pairwise_comparisons_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE portfolio_transactions
  ADD CONSTRAINT portfolio_transactions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE startup_submissions
  ADD CONSTRAINT startup_submissions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE gifts_given
  ADD CONSTRAINT gifts_given_giver_id_fkey
  FOREIGN KEY (giver_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE gifts_received
  ADD CONSTRAINT gifts_received_receiver_id_fkey
  FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE;

COMMIT;
    `

    console.log('📝 Migration SQL:')
    console.log(migrationSQL)
    console.log('')

    console.log('⚠️  This migration will:')
    console.log('   1. Drop foreign key constraints')
    console.log('   2. Change users.id from UUID to TEXT')
    console.log('   3. Change all foreign key columns to TEXT')
    console.log('   4. Re-add foreign key constraints')
    console.log('')
    console.log('🔧 To run this migration:')
    console.log('   1. Go to your Supabase Dashboard')
    console.log('   2. Navigate to SQL Editor')
    console.log('   3. Copy and paste the SQL above')
    console.log('   4. Click "Run"')
    console.log('')
    console.log('📖 Or run it via RPC:')

    // Save SQL to file
    const fs = require('fs')
    const path = require('path')
    const sqlFilePath = path.join(__dirname, 'migrate-user-ids.sql')
    fs.writeFileSync(sqlFilePath, migrationSQL)

    console.log(`✅ SQL saved to: ${sqlFilePath}`)
    console.log('')
    console.log('💡 After running the migration, existing UUID-based users will be cleared.')
    console.log('   New Auth0 users will have IDs like: "google-oauth2|123456789"')

  } catch (error) {
    console.error('❌ Migration preparation failed:', error)
    process.exit(1)
  }
}

migrateUserIdsToText()
