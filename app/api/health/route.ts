import { NextResponse } from 'next/server'
import { checkDatabaseSetup } from '@/lib/db/migrate'

/**
 * Health check endpoint that also verifies database setup
 * Call this to check if migrations have been run
 */
export async function GET() {
  try {
    const dbReady = await checkDatabaseSetup()

    if (!dbReady) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'Database tables missing. Run migrations in Supabase SQL Editor.',
          tables: ['users', 'startups', 'pairwise_comparisons', 'holdings', 'trades']
        },
        { status: 503 }
      )
    }

    return NextResponse.json({
      status: 'ok',
      message: 'Database is ready',
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'error',
        message: error.message || 'Unknown error',
      },
      { status: 500 }
    )
  }
}
