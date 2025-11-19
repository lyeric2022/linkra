/**
 * Automated migration runner
 * Connects directly to Supabase PostgreSQL database and runs migrations
 * 
 * Usage:
 *   bun run scripts/migrate-auto.ts
 * 
 * Requires: SUPABASE_DB_PASSWORD in .env.local
 * Get it from: Supabase Dashboard → Settings → Database → Connection string
 */

import { Client } from 'pg'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { config } from 'dotenv'

// Load environment variables
config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL')
  process.exit(1)
}

// Extract project ref from URL (e.g., https://kxogaqxjojjstgidvdgv.supabase.co)
const projectRef = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/)?.[1]

if (!projectRef) {
  console.error('❌ Could not extract project ref from Supabase URL')
  process.exit(1)
}

// Supabase connection details
// We need the database password - user needs to get it from Supabase Dashboard
const dbPassword = process.env.SUPABASE_DB_PASSWORD

if (!dbPassword) {
  console.error('❌ Missing SUPABASE_DB_PASSWORD')
  console.error('\n📝 To get your database password:')
  console.error('   1. Go to Supabase Dashboard → Settings → Database')
  console.error('   2. Find "Connection string" section')
  console.error('   3. Copy the password from the connection string')
  console.error('   4. Add to .env.local: SUPABASE_DB_PASSWORD=your_password')
  console.error('\n   Or use the "Connection pooling" connection string')
  process.exit(1)
}

const dbConfig = {
  host: `db.${projectRef}.supabase.co`,
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: dbPassword,
  ssl: {
    rejectUnauthorized: false
  }
}

async function runMigrations() {
  console.log('🚀 Running database migrations automatically...\n')

  // Read SQL file
  const schemaPath = join(process.cwd(), 'supabase', 'schema.sql')
  
  if (!existsSync(schemaPath)) {
    console.error(`❌ Schema file not found: ${schemaPath}`)
    process.exit(1)
  }

  const sql = readFileSync(schemaPath, 'utf-8')
  console.log(`📖 Read schema file (${sql.length} characters)\n`)

  // Connect to database
  const client = new Client(dbConfig)
  
  try {
    console.log('🔌 Connecting to Supabase database...')
    await client.connect()
    console.log('✅ Connected!\n')

    // Execute the entire SQL file
    console.log('💾 Executing migrations...')
    await client.query(sql)
    
    console.log('✅ Migrations executed successfully!\n')

    // Verify tables were created
    console.log('🔍 Verifying tables...')
    const tables = ['users', 'startups', 'pairwise_comparisons', 'holdings', 'trades']
    
    for (const table of tables) {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        );
      `, [table])
      
      if (result.rows[0].exists) {
        console.log(`✅ Table '${table}' exists`)
      } else {
        console.log(`❌ Table '${table}' missing`)
      }
    }

    console.log('\n✨ Migration complete!')
    console.log('💡 Next step: Run `bun run seed` to populate with YC companies')

  } catch (error: any) {
    console.error('\n❌ Migration failed:')
    console.error(error.message)
    
    if (error.message.includes('password authentication failed')) {
      console.error('\n💡 Tip: Check your SUPABASE_DB_PASSWORD in .env.local')
      console.error('   Get it from: Supabase Dashboard → Settings → Database → Connection string')
    }
    
    process.exit(1)
  } finally {
    await client.end()
  }
}

runMigrations().catch(console.error)

