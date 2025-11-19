import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Use service role key to bypass RLS for API operations
const supabase = createClient(supabaseUrl, supabaseServiceKey)

/**
 * POST /api/submit-startup
 * Submit a new startup for review
 * Requires: startup data in request body
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, website, sector, stage, location, logo_url, batch, userId } = body

    // Validate required fields
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Startup name is required' },
        { status: 400 }
      )
    }

    // Optional: Validate URL format if website is provided
    if (website && website.trim().length > 0) {
      try {
        new URL(website)
      } catch {
        return NextResponse.json(
          { error: 'Invalid website URL format' },
          { status: 400 }
        )
      }
    }

    // Optional: Validate logo URL format if provided
    if (logo_url && logo_url.trim().length > 0) {
      try {
        new URL(logo_url)
      } catch {
        return NextResponse.json(
          { error: 'Invalid logo URL format' },
          { status: 400 }
        )
      }
    }

    // Insert submission into database
    const { data, error } = await supabase
      .from('startup_submissions')
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        website: website?.trim() || null,
        sector: sector?.trim() || null,
        stage: stage?.trim() || null,
        location: location?.trim() || null,
        logo_url: logo_url?.trim() || null,
        batch: batch?.trim() || null,
        submitted_by: userId || null,
        status: 'pending',
      })
      .select()
      .single()

    if (error) {
      console.error('❌ [SUBMIT-STARTUP] Error inserting submission:', error)
      return NextResponse.json(
        { error: 'Failed to submit startup. Please try again.' },
        { status: 500 }
      )
    }

    console.log(`✅ [SUBMIT-STARTUP] New startup submission: ${name} (ID: ${data.id})`)

    return NextResponse.json({
      success: true,
      message: 'Startup submitted successfully! It will be reviewed and added manually.',
      submission: {
        id: data.id,
        name: data.name,
      },
    })
  } catch (error: any) {
    console.error('❌ [SUBMIT-STARTUP] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to submit startup' },
      { status: 500 }
    )
  }
}

