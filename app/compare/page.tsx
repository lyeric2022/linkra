'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Startup } from '@/lib/types/database'
import PairwiseComparison from '@/components/PairwiseComparison'
import { useAuthContext } from '@/lib/contexts/AuthContext'

export default function ComparePage() {
  const [startupA, setStartupA] = useState<Startup | null>(null)
  const [startupB, setStartupB] = useState<Startup | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMessage, setLoadingMessage] = useState<string>('Loading comparison...')
  const [nextPair, setNextPair] = useState<[Startup, Startup] | null>(null)
  const [batchFilter, setBatchFilter] = useState<string>('Fall 2025')
  const [availableBatches, setAvailableBatches] = useState<string[]>([])
  const isLoadingRef = useRef(false)
  
  // AuthGuard handles auth - we can assume user exists on protected routes
  const { user, loading: authLoading } = useAuthContext()

  // Load available batches on mount
  useEffect(() => {
    const loadBatches = async () => {
      try {
        const { data: startups } = await supabase
          .from('startups')
          .select('batch')
          .not('batch', 'is', null)
        
        if (startups) {
          const batches = Array.from(new Set(startups.map(s => s.batch).filter(Boolean))) as string[]
          // Sort batches by year and season (Winter before Summer before Fall)
          batches.sort((a, b) => {
            const aMatch = a.match(/(\w+)\s+(\d{4})/)
            const bMatch = b.match(/(\w+)\s+(\d{4})/)
            if (!aMatch || !bMatch) return a.localeCompare(b)
            
            const [, aSeason, aYear] = aMatch
            const [, bSeason, bYear] = bMatch
            
            // Sort by year descending, then by season (Winter > Summer > Fall)
            if (aYear !== bYear) return parseInt(bYear) - parseInt(aYear)
            const seasonOrder: Record<string, number> = { Winter: 0, Summer: 1, Fall: 2 }
            return (seasonOrder[aSeason] || 99) - (seasonOrder[bSeason] || 99)
          })
          setAvailableBatches(batches)
          
          // If "Fall 2025" doesn't exist, default to first available batch
          if (!batches.includes('Fall 2025') && batches.length > 0) {
            setBatchFilter(batches[0])
          }
        }
      } catch (error) {
        console.error('❌ [COMPARE] Error loading batches:', error)
      }
    }
    
    loadBatches()
  }, [])

  useEffect(() => {
    // Wait for auth to finish initializing
    if (authLoading) return
    
    // If no user after auth loads, middleware should have redirected
    // But just in case, don't try to load
    if (!user) {
      setLoading(false)
      return
    }
    
    // Clear preloaded pair when batch changes (it's from a different batch)
    setNextPair(null)
    
    // Load comparison once user is available
    loadComparisonWithUserId(user.id, true).catch(error => {
      console.error('❌ [COMPARE] Error loading comparison:', error)
      setLoading(false)
      setLoadingMessage('Failed to load comparison. Please refresh.')
    })
  }, [user, authLoading, batchFilter])

  const fetchComparisonPair = async (currentUserId: string): Promise<[Startup, Startup] | null> => {
    try {
      if (!currentUserId) {
        console.error('❌ [COMPARE] No userId available')
        return null
      }

      setLoadingMessage('Checking your voting history...')
      
      // Get all startups the user has already voted on
      const { data: userComparisons, error: compError } = await supabase
        .from('pairwise_comparisons')
        .select('startup_a_id, startup_b_id')
        .eq('user_id', currentUserId)

      if (compError) {
        console.error('❌ [COMPARE] Error fetching user comparisons:', compError)
        // Continue anyway - better to show duplicates than fail completely
      }

      // Collect all startup IDs the user has already seen
      const seenStartupIds = new Set<string>()
      userComparisons?.forEach(comp => {
        seenStartupIds.add(comp.startup_a_id)
        seenStartupIds.add(comp.startup_b_id)
      })


      setLoadingMessage('Finding available startups...')
      
      // Build base query with batch filter
      let baseQuery = supabase.from('startups').select('*', { count: 'exact', head: true })
      if (batchFilter && batchFilter !== 'all') {
        baseQuery = baseQuery.eq('batch', batchFilter)
      }
      
      // Get total startup count first (filtered by batch)
      const { count: totalStartupCount } = await baseQuery
      
      const totalStartupsInDb = totalStartupCount || 0
      
      // Only allow duplicates if we've truly run out of unique pairs
      // Calculate possible unique pairs: n * (n-1) / 2
      const uniqueStartups = totalStartupsInDb - seenStartupIds.size
      const possibleUniquePairs = uniqueStartups * (uniqueStartups - 1) / 2
      const allowDuplicates = possibleUniquePairs < 1
      
      // Check how many startups are available (excluding seen ones)
      let availableCount = 0
      if (!allowDuplicates && seenStartupIds.size > 0) {
        // Use a safer approach: get all IDs and filter in memory
        // Supabase .not('id', 'in', ...) syntax can be problematic
        let countQuery = supabase.from('startups').select('*', { count: 'exact', head: true })
        if (batchFilter && batchFilter !== 'all') {
          countQuery = countQuery.eq('batch', batchFilter)
        }
        const { count: totalCount } = await countQuery
        availableCount = Math.max(0, (totalCount || 0) - seenStartupIds.size)
      } else {
        let countQuery = supabase.from('startups').select('*', { count: 'exact', head: true })
        if (batchFilter && batchFilter !== 'all') {
          countQuery = countQuery.eq('batch', batchFilter)
        }
        const { count } = await countQuery
        availableCount = count || 0
      }
      

      // If not enough new startups available, allow duplicates
      if (availableCount < 2 && !allowDuplicates) {
        // Allow duplicates if not enough new startups
      }

      setLoadingMessage('Selecting startups to compare...')

      // Get a pool of startups and filter out seen ones
      let candidateQuery = supabase
        .from('startups')
        .select('*')
        .limit(100) // Get a pool of 100 startups

      if (batchFilter && batchFilter !== 'all') {
        candidateQuery = candidateQuery.eq('batch', batchFilter)
      }

      const { data: candidateStartups, error: baseError } = await candidateQuery

      if (baseError || !candidateStartups || candidateStartups.length === 0) {
        console.error('❌ [COMPARE] Error fetching startups:', baseError)
        throw baseError || new Error('No startups found')
      }

      // Filter out seen startups if not allowing duplicates
      let availableStartups = candidateStartups
      if (!allowDuplicates && seenStartupIds.size > 0) {
        availableStartups = candidateStartups.filter(s => !seenStartupIds.has(s.id))

        // If filtering left us with too few, fall back to all candidates
        if (availableStartups.length < 2) {
          availableStartups = candidateStartups
        }
      }

      // Pick a random base startup from available pool
      let baseStartup = availableStartups[Math.floor(Math.random() * availableStartups.length)]
      
      if (baseError || !baseStartup) {
        console.error('❌ [COMPARE] Error fetching base startup:', baseError)
        throw baseError
      }
      
      const baseElo = baseStartup.elo_rating || 1500
      const eloRange = 200 // Match within ±200 Elo points

      // Filter available startups for similar ELO and not the base startup
      let similarStartups = availableStartups
        .filter(s => s.id !== baseStartup.id) // Don't match with itself
        .filter(s => {
          const elo = s.elo_rating || 1500
          return elo >= baseElo - eloRange && elo <= baseElo + eloRange
        })

      // Pick a random opponent from similar ELO startups
      let randomOpponent = similarStartups.length > 0
        ? similarStartups[Math.floor(Math.random() * similarStartups.length)]
        : null
      
      // Build startup pair
      let startups = [baseStartup]
      if (randomOpponent) {
        startups.push(randomOpponent)
      } else {
        // No similar ELO opponent found, pick any other startup from available pool
        const otherStartups = availableStartups.filter(s => s.id !== baseStartup.id)
        if (otherStartups.length > 0) {
          startups.push(otherStartups[Math.floor(Math.random() * otherStartups.length)])
        }
      }
      
      // Shuffle the pair so base isn't always on left
      if (Math.random() > 0.5) {
        startups = [startups[1], startups[0]]
      }

      if (startups && startups.length === 2) {
        // Get comparison counts for these startups
        const startupIds = startups.map(s => s.id)
        const { data: comparisons } = await supabase
          .from('pairwise_comparisons')
          .select('startup_a_id, startup_b_id')
          .or(`startup_a_id.in.(${startupIds.join(',')}),startup_b_id.in.(${startupIds.join(',')})`)

        // Count comparisons per startup
        const counts = new Map<string, number>()
        comparisons?.forEach(comp => {
          if (startupIds.includes(comp.startup_a_id)) {
            counts.set(comp.startup_a_id, (counts.get(comp.startup_a_id) || 0) + 1)
          }
          if (startupIds.includes(comp.startup_b_id)) {
            counts.set(comp.startup_b_id, (counts.get(comp.startup_b_id) || 0) + 1)
          }
        })

        // Add comparison counts
        const enrichedStartups = startups.map(startup => ({
          ...startup,
          comparison_count: counts.get(startup.id) || 0,
        }))
        
        return [enrichedStartups[0] as Startup, enrichedStartups[1] as Startup]
      } else {
        // Not enough startups in database
        return null
      }
    } catch (error) {
      console.error('Error fetching comparison:', error)
      return null
    }
  }

  const loadComparisonWithUserId = async (currentUserId: string, isInitialLoad = false) => {
    if (isLoadingRef.current) {
      return
    }
    
    isLoadingRef.current = true
    if (isInitialLoad) {
      setLoading(true)
      setLoadingMessage('Preparing comparison...')
    }
    
    try {
    // If we have a preloaded next pair, use it immediately
    if (nextPair) {
      setStartupA(nextPair[0])
      setStartupB(nextPair[1])
      setNextPair(null)
      
      // Start loading the NEXT pair in background
      fetchComparisonPair(currentUserId).then(pair => {
        if (pair) {
          setNextPair(pair)
        }
        }).catch(err => {
          console.error('Error preloading next pair:', err)
      })
    } else {
      // No preloaded pair, fetch one now
      const pair = await fetchComparisonPair(currentUserId)
      if (pair) {
        setStartupA(pair[0])
        setStartupB(pair[1])
        
        // Preload the next one
        fetchComparisonPair(currentUserId).then(nextPair => {
          if (nextPair) {
            setNextPair(nextPair)
          }
          }).catch(err => {
            console.error('Error preloading next pair:', err)
        })
        } else {
          if (isInitialLoad) {
            setLoadingMessage('Not enough startups available')
          }
        }
      }
    } catch (error) {
      console.error('Error in loadComparisonWithUserId:', error)
      if (isInitialLoad) {
        setLoadingMessage('Failed to load comparison')
    }
    } finally {
    if (isInitialLoad) setLoading(false)
    isLoadingRef.current = false
    }
  }

  const handleComparisonComplete = () => {
    if (user) {
      loadComparisonWithUserId(user.id, false)
    }
  }

  // Show loading state while auth initializes or fetching comparison
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white mb-4"></div>
          <div className="text-gray-600 dark:text-gray-400 font-medium">
            {authLoading ? 'Loading...' : loadingMessage}
          </div>
        </div>
      </div>
    )
  }

  // If no user after loading, middleware should have redirected
  // But show fallback just in case
  if (!user) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <p className="mb-4">Please sign in to continue.</p>
        </div>
      </div>
    )
  }

  if (!startupA || !startupB) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <p className="mb-4">Not enough startups available for voting.</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Add more startups to the database to start voting.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-16">
      {/* Batch Filter */}
      <div className="mb-8 flex justify-center">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Filter by Batch:
            </label>
            <select
              value={batchFilter}
              onChange={(e) => {
                setBatchFilter(e.target.value)
                setNextPair(null) // Clear preloaded pair when batch changes
              }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm font-medium focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent transition-all"
            >
              <option value="all">All Batches</option>
              {availableBatches.map(batch => (
                <option key={batch} value={batch}>{batch}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <PairwiseComparison
        key={`${startupA.id}-${startupB.id}`}
        startupA={startupA}
        startupB={startupB}
        userId={user.id}
        onComparisonComplete={handleComparisonComplete}
      />
    </div>
  )
}

