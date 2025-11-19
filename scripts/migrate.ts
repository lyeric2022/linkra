/**
 * Proper migration system that tracks applied migrations
 * Only runs migrations that haven't been applied yet
 */

import { Client } from 'pg'
import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const dbPassword = process.env.SUPABASE_DB_PASSWORD!

if (!supabaseUrl || !dbPassword) {
  console.error('❌ Missing required environment variables')
  console.error('Need: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_DB_PASSWORD')
  process.exit(1)
}

const projectRef = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/)?.[1]
if (!projectRef) {
  console.error('❌ Could not extract project ref from Supabase URL')
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

async function ensureMigrationsTable(client: Client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.schema_migrations (
      version VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    );
  `)
}

async function getAppliedMigrations(client: Client): Promise<Set<string>> {
  const result = await client.query('SELECT version FROM public.schema_migrations')
  return new Set(result.rows.map((row: any) => row.version))
}

async function markMigrationApplied(client: Client, version: string) {
  await client.query(
    'INSERT INTO public.schema_migrations (version) VALUES ($1) ON CONFLICT (version) DO NOTHING',
    [version]
  )
}

async function runMigrations() {
  console.log('🚀 Running database migrations...\n')

  const migrationsDir = join(process.cwd(), 'supabase', 'migrations')
  
  // Get all migration files, sorted
  const migrationFiles = readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort()

  if (migrationFiles.length === 0) {
    console.log('ℹ️  No migration files found')
    return
  }

  console.log(`📋 Found ${migrationFiles.length} migration file(s)\n`)

  const client = new Client(dbConfig)
  
  try {
    await client.connect()
    console.log('✅ Connected to database\n')

    // Ensure migrations table exists
    await ensureMigrationsTable(client)

    // Get already applied migrations
    const appliedMigrations = await getAppliedMigrations(client)
    console.log(`📊 Already applied: ${appliedMigrations.size} migration(s)\n`)

    let appliedCount = 0

    // Run each migration
    for (const file of migrationFiles) {
      const version = file.replace('.sql', '')
      
      if (appliedMigrations.has(version)) {
        console.log(`⏭️  Skipping ${file} (already applied)`)
        continue
      }

      console.log(`🔄 Applying ${file}...`)
      
      const sql = readFileSync(join(migrationsDir, file), 'utf-8')
      
      try {
        await client.query('BEGIN')
        await client.query(sql)
        await markMigrationApplied(client, version)
        await client.query('COMMIT')
        
        console.log(`✅ Applied ${file}\n`)
        appliedCount++
      } catch (error: any) {
        await client.query('ROLLBACK')
        console.error(`❌ Failed to apply ${file}:`, error.message)
        throw error
      }
    }

    if (appliedCount === 0) {
      console.log('✨ All migrations already applied!\n')
    } else {
      console.log(`✨ Applied ${appliedCount} new migration(s)!\n`)
    }

  } catch (error: any) {
    console.error('❌ Migration failed:', error.message)
    process.exit(1)
  } finally {
    await client.end()
  }
}

runMigrations().catch(console.error)
