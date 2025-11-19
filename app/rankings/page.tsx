'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Startup } from '@/lib/types/database'
import StartupCard from '@/components/StartupCard'
import Link from 'next/link'
import { cache, CACHE_KEYS, CACHE_TTL } from '@/lib/utils/cache'

// Hook to track window size
function useWindowSize() {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
  })

  useEffect(() => {
    function handleResize() {
      setWindowSize({
        width: window.innerWidth,
      })
    }

    window.addEventListener('resize', handleResize)
    handleResize()
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return windowSize
}

type SortOption = 'elo' | 'votes' | 'name' | 'price'

export default function RankingsPage() {
  const { width } = useWindowSize()
  const [startups, setStartups] = useState<Startup[]>([])
  const [allStartups, setAllStartups] = useState<Startup[]>([])
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState<string>('Initializing...')
  const [error, setError] = useState<string | null>(null)
  const [comparisonCount, setComparisonCount] = useState<number | null>(null)
  const [sortBy, setSortBy] = useState<SortOption>('elo')
  const [sectorFilter, setSectorFilter] = useState<string>('all')
  const [batchFilter, setBatchFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const itemsPerPage = 50
  const isMobile = width < 640

  useEffect(() => {
    let mounted = true

    // Initial load with mounted guard
    if (mounted) {
      loadRankings(true).finally(() => {
        if (mounted) {
          console.log('📊 [RANKINGS] Initial load completed')
        }
      })
      loadStats()
    }
    
    // Refresh rankings less frequently (every 30 seconds instead of 5)
    const interval = setInterval(() => {
      if (mounted) {
        loadRankings(false)
        loadStats()
      }
    }, 30000)
    
    return () => {
      mounted = false
      clearInterval(interval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    applyFiltersAndSort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy, sectorFilter, batchFilter, searchQuery, currentPage, allStartups])

  const loadStats = async () => {
    try {
      const { count } = await supabase
        .from('pairwise_comparisons')
        .select('*', { count: 'exact', head: true })
      setComparisonCount(count || 0)
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }


  const loadRankings = async (isInitialLoad = false) => {
    const startTime = performance.now()
    try {
      console.log('📊 [RANKINGS] Starting to load rankings...', isInitialLoad ? '(initial)' : '(refresh)')
      
      // Only show main loading spinner on initial load, not on refreshes
      if (isInitialLoad) {
        setLoading(true)
        setLoadingMessage('Checking cache...')
      } else {
        setIsRefreshing(true)
      }
      setError(null)
      
      // Check cache first (only on refreshes, not initial load to ensure fresh data)
      if (!isInitialLoad) {
        const cachedStartups = cache.get<Startup[]>(CACHE_KEYS.STARTUPS)
        if (cachedStartups && cachedStartups.length > 0) {
          console.log('⚡ [RANKINGS] Using cached data:', cachedStartups.length, 'startups')
          setAllStartups(cachedStartups)
          setIsRefreshing(false)
          return
        }
      }
      
      // Get all startups with pagination (Supabase has a hard 1000 row limit)
      // Rankings are public - no auth needed
      setLoadingMessage('Getting total count...')
      console.log('📊 [RANKINGS] Fetching all startups with pagination...')
      
      // First, get total count
      const { count: totalStartupsCount, error: countError } = await supabase
        .from('startups')
        .select('*', { count: 'exact', head: true })
      
      if (countError) {
        console.error('❌ [RANKINGS] Error getting count:', countError)
        throw countError
      }
      
      console.log('📊 [RANKINGS] Total startups in DB:', totalStartupsCount || 0)
      setTotalCount(totalStartupsCount || 0)
      
      // Fetch ALL startups using sequential pagination (Supabase caps at 1000 per query)
      // Sequential is slower but more reliable than parallel
      const pageSize = 1000
      const totalPages = Math.ceil((totalStartupsCount || 0) / pageSize)
      
      console.log(`📊 [RANKINGS] Fetching ${totalPages} pages sequentially (${pageSize} per page)...`)
      
      const allStartupsData: any[] = []
      
      // Fetch pages sequentially to avoid overwhelming the connection
      for (let page = 0; page < totalPages; page++) {
        const start = page * pageSize
        const end = start + pageSize - 1
        
        setLoadingMessage(`Fetching page ${page + 1} of ${totalPages}... (${allStartupsData.length.toLocaleString()} loaded)`)
        console.log(`📊 [RANKINGS] Fetching page ${page + 1}/${totalPages} (rows ${start}-${end})...`)
        
        const { data: pageData, error: pageError } = await supabase
          .from('startups')
          .select('*')
          .order('elo_rating', { ascending: false, nullsFirst: false })
          .range(start, end)
        
        if (pageError) {
          console.error(`❌ [RANKINGS] Error fetching page ${page + 1}:`, pageError)
          throw pageError
        }
        
        if (pageData) {
          allStartupsData.push(...pageData)
          console.log(`✅ [RANKINGS] Page ${page + 1}/${totalPages} loaded: ${pageData.length} rows (total: ${allStartupsData.length})`)
        }
      }
      
      const startupsData = allStartupsData
      console.log(`✅ [RANKINGS] Fetched all ${startupsData.length} startups from ${totalPages} pages`)
      
      setLoadingMessage('Processing comparison counts...')
      
      console.log('📊 [RANKINGS] Loaded startups:', startupsData.length, 'of', totalStartupsCount || 0, 'total')
      if (startupsData && startupsData.length > 0) {
        console.log('📊 [RANKINGS] Sample Elo scores:', {
          top: startupsData[0]?.elo_rating,
          mid: startupsData[Math.floor(startupsData.length / 2)]?.elo_rating,
          bottom: startupsData[startupsData.length - 1]?.elo_rating,
        })
      }

      // Get all comparisons to count
      const { data: comparisons, error: compError } = await supabase
        .from('pairwise_comparisons')
        .select('startup_a_id, startup_b_id')

      if (compError) {
        console.warn('⚠️ [RANKINGS] Could not fetch comparison counts:', compError)
      }

      // Count comparisons per startup
      const comparisonCounts = new Map<string, number>()
      comparisons?.forEach(comp => {
        comparisonCounts.set(comp.startup_a_id, (comparisonCounts.get(comp.startup_a_id) || 0) + 1)
        comparisonCounts.set(comp.startup_b_id, (comparisonCounts.get(comp.startup_b_id) || 0) + 1)
      })

      setLoadingMessage('Finalizing rankings...')
      
      // Add comparison counts to startups
      const startupsWithCounts = (startupsData || []).map(startup => ({
        ...startup,
        comparison_count: comparisonCounts.get(startup.id) || 0,
      }))
      
      // Cache the results for 30 seconds
      cache.set(CACHE_KEYS.STARTUPS, startupsWithCounts, CACHE_TTL.SHORT)
      
      setAllStartups(startupsWithCounts as Startup[])
      
      const totalTime = performance.now() - startTime
      console.log(`✅ [RANKINGS] Successfully loaded rankings and cached in ${totalTime.toFixed(0)}ms`)
    } catch (error: any) {
      const totalTime = performance.now() - startTime
      console.error(`❌ [RANKINGS] Error loading rankings after ${totalTime.toFixed(0)}ms:`, error)
      setError(error?.message || 'Failed to load rankings. Please refresh the page.')
      // Set empty array on error so UI doesn't hang
      setAllStartups([])
      setTotalCount(0)
    } finally {
      const totalTime = performance.now() - startTime
      setLoading(false)
      setIsRefreshing(false)
      console.log(`📊 [RANKINGS] Loading complete in ${totalTime.toFixed(0)}ms - loading state set to false`)
    }
  }

  const applyFiltersAndSort = () => {
    let filtered = [...allStartups]

    // Apply search filter (case-insensitive partial match)
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase()
      filtered = filtered.filter(s => 
        s.name.toLowerCase().includes(query)
      )
    }

    // Apply sector filter
    if (sectorFilter !== 'all') {
      filtered = filtered.filter(s => s.sector === sectorFilter)
    }

    // Apply batch filter
    if (batchFilter !== 'all') {
      filtered = filtered.filter(s => s.batch === batchFilter)
    }

    // Apply sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'elo':
          return (b.elo_rating || 1500) - (a.elo_rating || 1500)
        case 'votes':
          return ((b as any).comparison_count || 0) - ((a as any).comparison_count || 0)
        case 'name':
          return a.name.localeCompare(b.name)
        case 'price':
          return (b.elo_rating || 1500) - (a.elo_rating || 1500)
        default:
          return 0
      }
    })

    // Apply pagination
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    setStartups(filtered.slice(startIndex, endIndex))
  }

  const getAvailableSectors = () => {
    const sectors = new Set<string>()
    allStartups.forEach(s => {
      if (s.sector) sectors.add(s.sector)
    })
    return Array.from(sectors).sort()
  }

  const getAvailableBatches = () => {
    const batches = new Set<string>()
    allStartups.forEach(s => {
      if (s.batch) batches.add(s.batch)
    })
    // Sort batches by year and season (Winter before Summer)
    return Array.from(batches).sort((a, b) => {
      // Extract year and season
      const aMatch = a.match(/(\w+)\s+(\d{4})/)
      const bMatch = b.match(/(\w+)\s+(\d{4})/)
      if (!aMatch || !bMatch) return a.localeCompare(b)
      
      const [, aSeason, aYear] = aMatch
      const [, bSeason, bYear] = bMatch
      
      // Sort by year descending, then by season (Winter > Summer)
      if (aYear !== bYear) return parseInt(bYear) - parseInt(aYear)
      return aSeason === 'Winter' ? -1 : bSeason === 'Winter' ? 1 : aSeason.localeCompare(bSeason)
    })
  }

  const getFilteredCount = () => {
    let filtered = [...allStartups]
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase()
      filtered = filtered.filter(s => 
        s.name.toLowerCase().includes(query)
      )
    }
    
    if (sectorFilter !== 'all') {
      filtered = filtered.filter(s => s.sector === sectorFilter)
    }
    if (batchFilter !== 'all') {
      filtered = filtered.filter(s => s.batch === batchFilter)
    }
    return filtered.length
  }

  const totalPages = Math.ceil(getFilteredCount() / itemsPerPage)

  if (loading && allStartups.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white mb-4"></div>
          <div className="text-gray-600 dark:text-gray-400 font-medium">{loadingMessage}</div>
          {error && (
            <div className="mt-4 text-red-600 dark:text-red-400 text-sm max-w-md">
              {error}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                  Global Startup Rankings
                </h1>
                {comparisonCount !== null && (
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>
                      Based on {comparisonCount.toLocaleString()} votes
                    </span>
                    <span className="text-gray-400 dark:text-gray-500">·</span>
                    <span className="text-xs">
                      {allStartups.length.toLocaleString()} startups loaded
                    </span>
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  cache.clear()
                  loadRankings(true)
                }}
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                title="Clear cache and reload"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>

          {/* Filters and Sort Card */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 mb-6 shadow-sm">
            <div className="flex flex-wrap items-center gap-4">
              {/* Search Input */}
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <svg 
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      setCurrentPage(1)
                    }}
                    placeholder="Search by name..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery('')
                        setCurrentPage(1)
                      }}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      aria-label="Clear search"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Sort by:</label>
                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value as SortOption)
                    setCurrentPage(1)
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm font-medium focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent transition-all"
                >
                  <option value="elo">Elo Rating</option>
                  <option value="votes">Most Votes</option>
                  <option value="name">Name (A-Z)</option>
                  <option value="price">Price</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Sector:</label>
                <select
                  value={sectorFilter}
                  onChange={(e) => {
                    setSectorFilter(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm font-medium focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent transition-all"
                >
                  <option value="all">All Sectors</option>
                  {getAvailableSectors().map(sector => (
                    <option key={sector} value={sector}>{sector}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Batch:</label>
                <select
                  value={batchFilter}
                  onChange={(e) => {
                    setBatchFilter(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm font-medium focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent transition-all"
                >
                  <option value="all">All Batches</option>
                  {getAvailableBatches().map(batch => (
                    <option key={batch} value={batch}>{batch}</option>
                  ))}
                </select>
              </div>

              <div className="ml-auto flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                <span className="font-medium">
                  Showing {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, getFilteredCount())} of {getFilteredCount().toLocaleString()}
                </span>
              </div>
            </div>
          </div>
      
          {startups.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-12 text-center shadow-sm">
              <svg className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-700 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
              <p className="text-gray-600 dark:text-gray-400 mb-2 font-medium">
                No startups found
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
                Try adjusting your filters or start voting on startups to build the rankings!
              </p>
              <Link
                href="/compare"
                className="inline-flex items-center gap-2 px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-lg font-semibold hover:opacity-90 transition-all"
              >
                Start Voting
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          ) : (
            <>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {startups.map((startup) => (
                  <Link key={startup.id} href={`/startup/${startup.id}`} className="group">
                    <StartupCard 
                      startup={startup} 
                      showPrice 
                      showElo 
                      showComparisonCount
                      hasVoted={true}
                    />
                  </Link>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-3 sm:p-4 shadow-sm">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
                    {/* Page Info - Hidden on very small screens */}
                    <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 order-2 sm:order-1">
                      Page {currentPage} of {totalPages}
                    </div>
                    
                    {/* Pagination Controls */}
                    <div className="flex items-center gap-1 sm:gap-2 order-1 sm:order-2 w-full sm:w-auto justify-center">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-3 sm:px-4 py-1.5 sm:py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-xs sm:text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        aria-label="Previous page"
                      >
                        <span className="hidden sm:inline">Previous</span>
                        <span className="sm:hidden">Prev</span>
                      </button>
                      
                      {/* Page Numbers - Show fewer on mobile */}
                      <div className="flex items-center gap-0.5 sm:gap-1">
                        {Array.from({ length: Math.min(isMobile ? 3 : 5, totalPages) }, (_, i) => {
                          let pageNum: number
                          const maxPages = isMobile ? 3 : 5
                          
                          if (totalPages <= maxPages) {
                            pageNum = i + 1
                          } else if (currentPage <= Math.floor(maxPages / 2) + 1) {
                            pageNum = i + 1
                          } else if (currentPage >= totalPages - Math.floor(maxPages / 2)) {
                            pageNum = totalPages - maxPages + 1 + i
                          } else {
                            pageNum = currentPage - Math.floor(maxPages / 2) + i
                          }
                          
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setCurrentPage(pageNum)}
                              className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all min-w-[2rem] sm:min-w-[2.5rem] ${
                                currentPage === pageNum
                                  ? 'bg-black dark:bg-white text-white dark:text-black shadow-sm'
                                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                              }`}
                              aria-label={`Go to page ${pageNum}`}
                            >
                              {pageNum}
                            </button>
                          )
                        })}
                      </div>

                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 sm:px-4 py-1.5 sm:py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-xs sm:text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        aria-label="Next page"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

