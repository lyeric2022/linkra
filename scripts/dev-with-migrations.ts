/**
 * Development server with automatic migrations and seeding
 * Runs migrations before starting the dev server
 * Auto-seeds if database is empty
 */

import { spawn } from 'child_process'
import { exec } from 'child_process'
import { promisify } from 'util'
import * as dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' })

const execAsync = promisify(exec)

// Initialize Supabase client for checking data
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

async function runMigrations() {
  console.log('🔄 Checking if migrations need to run...\n')
  
  try {
    // Check if SUPABASE_DB_PASSWORD is set
    const dbPassword = process.env.SUPABASE_DB_PASSWORD
    
    if (!dbPassword) {
      console.log('⚠️  SUPABASE_DB_PASSWORD not set, skipping auto-migration')
      console.log('   Migrations will need to be run manually or via `bun run migrate:auto`\n')
      return false
    }

    // Run migrations
    console.log('🚀 Running database migrations...\n')
    const { stdout, stderr } = await execAsync('bun run migrate', {
      env: { ...process.env }
    })
    
    if (stdout) console.log(stdout)
    if (stderr && !stderr.includes('injecting env')) console.error(stderr)
    
    console.log('✅ Migrations complete!\n')
    return true
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message)
    console.log('   Continuing anyway - you can run migrations manually later\n')
    return false
  }
}

async function checkAndSeed() {
  if (!supabase) {
    console.log('⚠️  Supabase env vars not set, skipping seed check\n')
    return false
  }

  try {
    console.log('🔍 Checking if database needs seeding...\n')
    
    const { count, error } = await supabase
      .from('startups')
      .select('*', { count: 'exact', head: true })

    if (error) {
      console.log('⚠️  Could not check startup count:', error.message)
      console.log('   Continuing anyway...\n')
      return false
    }

    if (count === 0) {
      console.log('📦 Database is empty, running seed...\n')
      const { stdout, stderr } = await execAsync('bun run seed', {
        env: { ...process.env }
      })
      
      if (stdout) console.log(stdout)
      if (stderr && !stderr.includes('injecting env')) console.error(stderr)
      
      console.log('✅ Seeding complete!\n')
      return true
    } else {
      console.log(`✅ Database has ${count} startups, skipping seed\n`)
      return false
    }
  } catch (error: any) {
    console.error('❌ Seed check failed:', error.message)
    console.log('   Continuing anyway - you can run `bun run seed` manually later\n')
    return false
  }
}

async function startDevServer() {
  console.log('🚀 Starting Next.js dev server...\n')
  
  // Use npx to run next dev directly (avoid recursion)
  const devProcess = spawn('npx', ['next', 'dev'], {
    stdio: 'inherit',
    shell: false, // Fix deprecation warning
    env: { ...process.env }
  })

  devProcess.on('error', (error) => {
    console.error('❌ Failed to start dev server:', error)
    process.exit(1)
  })

  devProcess.on('exit', (code) => {
    process.exit(code || 0)
  })
}

async function main() {
  // Run migrations first
  await runMigrations()
  
  // Check and seed if empty
  await checkAndSeed()
  
  // Then start dev server
  await startDevServer()
}

main().catch(console.error)

