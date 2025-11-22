/**
 * API route to run migrations automatically
 * Can be called on server startup or manually
 *
 * GET /api/migrate - Check migration status
 * POST /api/migrate - Run migrations (requires SUPABASE_DB_PASSWORD)
 */

import { NextRequest, NextResponse } from 'next/server'
import { Client } from 'pg'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

function getSupabaseConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const dbPassword = process.env.SUPABASE_DB_PASSWORD

  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
  }

  if (!dbPassword) {
    throw new Error('Missing SUPABASE_DB_PASSWORD - migrations cannot run automatically')
  }

  const projectRef = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/)?.[1]
  if (!projectRef) {
    throw new Error('Could not extract project ref from Supabase URL')
  }

  return {
    host: `db.${projectRef}.supabase.co`,
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: dbPassword,
    ssl: {
      rejectUnauthorized: false
    }
  }
}

export async function GET() {
  try {
    const dbConfig = getSupabaseConfig()
    const client = new Client(dbConfig)

    await client.connect()

    // Check which tables exist
    const tables = ['users', 'startups', 'pairwise_comparisons', 'holdings', 'trades']
    const tableStatus: Record<string, boolean> = {}

    for (const table of tables) {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = $1
        );
      `, [table])
      tableStatus[table] = result.rows[0].exists
    }

    await client.end()

    const allExist = Object.values(tableStatus).every(exists => exists)

    return NextResponse.json({
      status: allExist ? 'ready' : 'needs_migration',
      tables: tableStatus,
      message: allExist
        ? 'All tables exist'
        : 'Some tables are missing - run POST /api/migrate to migrate'
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'error',
        message: error.message,
        hint: 'Make sure SUPABASE_DB_PASSWORD is set in .env.local'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const dbConfig = getSupabaseConfig()
    const client = new Client(dbConfig)

    await client.connect()

    // Read and execute schema
    const schemaPath = join(process.cwd(), 'supabase', 'schema.sql')
    if (!existsSync(schemaPath)) {
      await client.end()
      return NextResponse.json(
        { error: 'Schema file not found' },
        { status: 500 }
      )
    }

    const sql = readFileSync(schemaPath, 'utf-8')
    await client.query(sql)
    await client.end()

    return NextResponse.json({
      success: true,
      message: 'Migrations executed successfully'
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error.message,
        hint: 'Check SUPABASE_DB_PASSWORD in .env.local'
      },
      { status: 500 }
    )
  }
}
