/**
 * Seed script to import YC companies from the live YC API
 * 
 * Usage:
 *   bun run scripts/seed-startups.ts
 * 
 * Make sure your .env.local has SUPABASE_SERVICE_ROLE_KEY set
 * 
 * Data source: https://yc-oss.github.io/api/companies/all.json
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

// Load environment variables from .env.local
config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!')
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface YCCompany {
  id: number
  name: string
  website?: string
  all_locations?: string
  long_description?: string
  one_liner?: string
  industry?: string
  subindustry?: string
  batch?: string
  status?: string
  stage?: string
  small_logo_thumb_url?: string
  tags?: string[]
  launched_at?: number
}

// Map YC company stage to our stage format
function mapStage(ycStage?: string): string | null {
  if (!ycStage) return null
  
  const stageMap: Record<string, string> = {
    'idea': 'idea',
    'prototype': 'prototype',
    'seed': 'seed',
    'series-a': 'series-a',
    'series-b': 'series-b',
    'series-c': 'series-c',
    'series-d': 'series-d',
    'acquired': 'acquired',
    'public': 'public',
  }
  
  const normalized = ycStage.toLowerCase().replace(/\s+/g, '-')
  return stageMap[normalized] || 'seed' // Default to seed if unknown
}

// Transform YC company data to our startup schema
function transformCompany(yc: YCCompany) {
  // Fix logo URL if it's a relative path
  let logoUrl = yc.small_logo_thumb_url || null
  if (logoUrl && logoUrl.startsWith('/')) {
    logoUrl = null // Skip missing logos (they use placeholder paths like "/company/thumb/missing.png")
  }
  
  return {
    name: yc.name,
    description: yc.long_description || yc.one_liner || null,
    website: yc.website || null,
    sector: yc.industry || yc.subindustry || null,
    stage: mapStage(yc.stage),
    location: yc.all_locations || null,
    logo_url: logoUrl,
    batch: yc.batch || null, // YC batch (e.g., "Winter 2024", "Summer 2024")
    // Set initial market price (will be updated by trading activity)
    market_price: 10.00,
    // Set initial Elo rating (will be updated by ranking algorithm)
    elo_rating: 1500.00,
  }
}

async function seedStartups() {
  console.log('🚀 Starting seed process...\n')

  // Fetch from live YC API
  const apiUrl = 'https://yc-oss.github.io/api/companies/all.json'
  console.log(`📡 Fetching from ${apiUrl}...`)
  
  let companies: YCCompany[] = []
  
  try {
    const response = await fetch(apiUrl)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    companies = await response.json()
    console.log(`✅ Found ${companies.length} companies from YC API\n`)
  } catch (error: any) {
    console.error(`❌ Failed to fetch from API: ${error.message}`)
    console.error('   Falling back to local file if available...\n')
    
    // Fallback to local file if API fails
    const { readFileSync, existsSync } = await import('fs')
    const { join } = await import('path')
    const filePath = join(process.cwd(), 'all-yc-companies.json')
    
    if (!existsSync(filePath)) {
      console.error(`❌ Local file also not found: ${filePath}`)
      process.exit(1)
    }
    
    const fileContent = readFileSync(filePath, 'utf-8')
    companies = JSON.parse(fileContent)
    console.log(`✅ Loaded ${companies.length} companies from local file\n`)
  }
  
  if (companies.length === 0) {
    console.error('❌ No companies loaded!')
    process.exit(1)
  }

  // Filter to only active companies from recent years
  // Relaxed filter to get more companies (was too restrictive)
  const activeCompanies = companies.filter(c => {
    // Must be active
    if (c.status !== 'Active') return false
    
    // Check if batch is recent (last 3 years)
    if (c.batch) {
      // YC batches are like "Winter 2024", "Summer 2024", "Fall 2025"
      const batchYear = parseInt(c.batch.match(/\d{4}/)?.[0] || '0')
      const currentYear = new Date().getFullYear()
      return batchYear >= currentYear - 3 // Last 3 years (2022+)
    }
    
    return false
  })
  
  console.log(`📊 Active companies from last year: ${activeCompanies.length}`)
  console.log(`📊 Total companies: ${companies.length}\n`)
  
  if (activeCompanies.length === 0) {
    console.error('❌ No companies found matching criteria!')
    console.error('   Check that companies have launched_at timestamps or batch info')
    process.exit(1)
  }

  // Batch insert (Supabase has limits, so we'll do batches of 100)
  const batchSize = 100
  let inserted = 0
  let errors = 0
  const totalBatches = Math.ceil(activeCompanies.length / batchSize)

  console.log(`💾 Inserting ${activeCompanies.length} companies into Supabase in ${totalBatches} batches...\n`)

  const startTime = Date.now()

  for (let i = 0; i < activeCompanies.length; i += batchSize) {
    const batchNum = Math.floor(i / batchSize) + 1
    const batch = activeCompanies.slice(i, i + batchSize)
    const transformed = batch.map(transformCompany)

    console.log(`⏳ Processing batch ${batchNum}/${totalBatches} (${batch.length} companies)...`)

    const { data, error } = await supabase
      .from('startups')
      .insert(transformed)
      .select()

    if (error) {
      console.error(`❌ Error inserting batch ${batchNum}:`, error.message)
      console.error(`   Details:`, error)
      errors += batch.length
    } else {
      inserted += data?.length || 0
      const progress = ((i + batch.length) / activeCompanies.length * 100).toFixed(1)
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
      const rate = (inserted / (elapsed as any)).toFixed(1)
      const remaining = activeCompanies.length - inserted
      const eta = remaining > 0 ? ((remaining / parseFloat(rate)) / 60).toFixed(1) : '0'
      
      console.log(`✅ Batch ${batchNum}/${totalBatches} complete: ${inserted}/${activeCompanies.length} companies (${progress}%)`)
      console.log(`   ⏱️  Elapsed: ${elapsed}s | Rate: ${rate} companies/s | ETA: ${eta} min\n`)
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  console.log('\n✨ Seed complete!')
  console.log(`✅ Successfully inserted: ${inserted} companies`)
  if (errors > 0) {
    console.log(`❌ Errors: ${errors} companies`)
  }
  console.log('\n💡 Next steps:')
  console.log('   1. Run the ranking algorithm: POST /api/ranking')
  console.log('   2. Start comparing startups at /compare')
}

// Run the seed
seedStartups().catch(console.error)

