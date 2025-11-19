'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import Link from 'next/link'
import { ensureUserRecord } from '@/lib/utils/ensureUserRecord'

export default function TestPage() {
  const [checks, setChecks] = useState<Record<string, { status: 'checking' | 'pass' | 'fail', message: string }>>({})
  const [loading, setLoading] = useState(true)
  const [retrying, setRetrying] = useState(false)
  const [showDebug, setShowDebug] = useState(false)
  const [debugInfo, setDebugInfo] = useState<any>(null)

  useEffect(() => {
    // Auth is now handled by AuthProvider - no delay needed
    runChecks()
    loadDebugInfo()
  }, [])

  const loadDebugInfo = () => {
    if (typeof window === 'undefined') return
    
    const authToken = localStorage.getItem('supabase.auth.token')
    const parsed = authToken ? JSON.parse(authToken) : null
    setDebugInfo({
      hasToken: !!authToken,
      tokenLength: authToken?.length || 0,
      expiresAt: parsed?.expires_at ? new Date(parsed.expires_at * 1000).toLocaleString() : null,
      isExpired: parsed?.expires_at ? parsed.expires_at * 1000 < Date.now() : null,
    })
  }

  const handleRetry = () => {
    setRetrying(true)
    setChecks({})
    setLoading(true)
    loadDebugInfo()
    runChecks().finally(() => setRetrying(false))
  }

  const handleClearAuth = () => {
    if (confirm('Clear auth data? You will need to sign in again.')) {
      localStorage.removeItem('supabase.auth.token')
      supabase.auth.signOut()
      loadDebugInfo()
      handleRetry()
    }
  }

  async function runChecks() {
    console.log('🔍 [TEST] Starting health checks...')
    const results: Record<string, { status: 'checking' | 'pass' | 'fail', message: string }> = {}
    let authenticatedUser: any = null

    try {
      // 1. Check authentication with retry - session might not be ready on navigation
      results.auth = { status: 'checking', message: 'Checking authentication...' }
      setChecks({ ...results })
      
      try {
        console.log('🔐 [TEST] Checking auth session...')
        
        // Auth is now handled by global AuthProvider - just read the session with timeout
        const sessionPromise = supabase.auth.getSession()
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('getSession() timeout after 3s')), 3000)
        )
        
        const { data: { session }, error: sessionError } = await Promise.race([
          sessionPromise,
          timeoutPromise
        ]).catch(err => {
          console.error('🔴 [TEST] Session check timed out:', err)
          return { data: { session: null }, error: err }
        }) as any

        if (sessionError) {
          console.error('🔴 [TEST] Session error:', sessionError)
          results.auth = { status: 'fail', message: `Session error: ${sessionError.message}` }
        } else if (session?.user) {
          authenticatedUser = session.user
          console.log('✅ [TEST] Session found:', session.user.email)
          results.auth = { status: 'pass', message: `Signed in as ${session.user.email}` }
        } else {
          console.log('⚠️ [TEST] No session found')
          results.auth = { status: 'fail', message: 'Not authenticated. Sign in required.' }
        }
      } catch (error: any) {
        console.error('🔴 [TEST] Auth check failed:', error)
        results.auth = { status: 'fail', message: `Auth check failed: ${error.message}` }
      }
      setChecks({ ...results })

      // 2. Check user record exists (auto-create if missing)
      results.userRecord = { status: 'checking', message: 'Checking user record...' }
      setChecks({ ...results })
      
      if (authenticatedUser?.id) {
        try {
          console.log('👤 [TEST] Checking user record...')
          // Auto-create user record if missing
          const created = await ensureUserRecord(authenticatedUser.id, authenticatedUser.email || '')
          
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', authenticatedUser.id)
            .single()

          if (userError || !userData) {
            results.userRecord = { status: 'fail', message: `User record missing${created ? ' (attempted to create)' : ''}` }
          } else {
            results.userRecord = { status: 'pass', message: `User record exists ($${userData.virtual_currency} cash, ${userData.free_gifts_count || 5} gifts)` }
          }
        } catch (error: any) {
          console.error('🔴 [TEST] User record check failed:', error)
          results.userRecord = { status: 'fail', message: `Error: ${error.message}` }
        }
      } else {
        results.userRecord = { status: 'fail', message: 'Skipped (not authenticated)' }
      }
      setChecks({ ...results })

      // 3. Check startups table
      results.startups = { status: 'checking', message: 'Checking startups table...' }
      setChecks({ ...results })
      
      try {
        console.log('🏢 [TEST] Checking startups table...')
        const { data: startups, error: startupsError } = await supabase
          .from('startups')
          .select('id, name')
          .limit(5)

        if (startupsError) {
          results.startups = { status: 'fail', message: `Error: ${startupsError.message}` }
        } else if (!startups || startups.length === 0) {
          results.startups = { status: 'fail', message: 'No startups found. Run: bun run seed' }
        } else {
          results.startups = { status: 'pass', message: `Found ${startups.length} startups (e.g., ${startups[0]?.name})` }
        }
      } catch (error: any) {
        console.error('🔴 [TEST] Startups check failed:', error)
        results.startups = { status: 'fail', message: `Error: ${error.message}` }
      }
      setChecks({ ...results })

      // Get startups for next checks
      const { data: startups } = await supabase
        .from('startups')
        .select('id, name')
        .limit(5)

      // 4. Check comparisons table
      results.comparisons = { status: 'checking', message: 'Checking comparisons table...' }
      setChecks({ ...results })
      
      try {
        console.log('📊 [TEST] Checking comparisons table...')
        const { data: comparisons, error: comparisonsError } = await supabase
          .from('pairwise_comparisons')
          .select('id')
          .limit(1)

        if (comparisonsError) {
          results.comparisons = { status: 'fail', message: `Error: ${comparisonsError.message}` }
        } else {
          results.comparisons = { status: 'pass', message: 'Comparisons table accessible' }
        }
      } catch (error: any) {
        console.error('🔴 [TEST] Comparisons check failed:', error)
        results.comparisons = { status: 'fail', message: `Error: ${error.message}` }
      }
      setChecks({ ...results })

      // 5. Test write permission (comparisons)
      results.writePermission = { status: 'checking', message: 'Testing write permissions...' }
      setChecks({ ...results })
      
      if (authenticatedUser && startups && startups.length >= 2) {
        try {
          console.log('✍️ [TEST] Testing write permissions...')
          // Try to insert a test comparison (we'll delete it immediately)
          const testComparison = {
            user_id: authenticatedUser.id,
            startup_a_id: startups[0].id,
            startup_b_id: startups[1].id,
            chosen_startup_id: startups[0].id,
          }

          const { error: insertError } = await supabase
            .from('pairwise_comparisons')
            .insert(testComparison)

          if (insertError) {
            results.writePermission = { status: 'fail', message: `Cannot write: ${insertError.message}` }
          } else {
            // Clean up test comparison
            await supabase
              .from('pairwise_comparisons')
              .delete()
              .eq('user_id', authenticatedUser.id)
              .eq('startup_a_id', startups[0].id)
              .eq('startup_b_id', startups[1].id)
            
            results.writePermission = { status: 'pass', message: 'Can create comparisons' }
          }
        } catch (error: any) {
          console.error('🔴 [TEST] Write permission check failed:', error)
          results.writePermission = { status: 'fail', message: `Error: ${error.message}` }
        }
      } else {
        results.writePermission = { status: 'fail', message: `Skipped (need auth + startups)${authenticatedUser ? '' : ' - no auth'}${startups && startups.length >= 2 ? '' : ' - no startups'}` }
      }
      setChecks({ ...results })

      // 6. Check environment variables
      results.env = { status: 'checking', message: 'Checking environment...' }
      setChecks({ ...results })
      
      const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL
      const hasKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      
      if (!hasUrl || !hasKey) {
        results.env = { status: 'fail', message: 'Missing environment variables' }
      } else {
        results.env = { status: 'pass', message: 'Environment variables set' }
      }
      setChecks({ ...results })

      console.log('✅ [TEST] All checks completed')
    } catch (error: any) {
      console.error('🔴 [TEST] Critical error during checks:', error)
    } finally {
      setLoading(false)
      console.log('📊 [TEST] Health check finished')
    }
  }

  const allPassed = Object.values(checks).every(c => c.status === 'pass')
  const hasFailures = Object.values(checks).some(c => c.status === 'fail')
  const checkCount = Object.keys(checks).length
  const passCount = Object.values(checks).filter(c => c.status === 'pass').length

  const getStatusIcon = (status: 'checking' | 'pass' | 'fail') => {
    if (status === 'checking') {
      return (
        <div className="w-5 h-5 rounded-full border-2 border-gray-300 border-t-gray-600 animate-spin"></div>
      )
    }
    if (status === 'pass') {
      return (
        <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      )
    }
    return (
      <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    )
  }

  const getCheckIcon = (key: string) => {
    const icons: Record<string, React.ReactElement> = {
      auth: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      userRecord: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      startups: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      comparisons: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      writePermission: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
      env: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      ),
    }
    return icons[key] || (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-10">
            <Link 
              href="/" 
              className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 transition-colors mb-8"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Home
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              System Health Check
            </h1>
            <p className="text-gray-500 dark:text-gray-500">
              Verify all systems are operational
            </p>
          </div>

          {/* Summary */}
          {!loading && (
            <div className="mb-10">
              <div className={`text-sm mb-6 ${
                allPassed
                  ? 'text-gray-600 dark:text-gray-400'
                  : hasFailures
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-gray-500 dark:text-gray-500'
              }`}>
                {allPassed 
                  ? `All ${checkCount} checks passed successfully`
                  : hasFailures
                  ? `${passCount} of ${checkCount} checks passed`
                  : 'Running checks...'
                }
              </div>
              <div className="flex items-center gap-4">
                {allPassed && (
                  <Link
                    href="/compare"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg font-medium hover:opacity-90 transition-all"
                  >
                    Start Voting
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                )}
                {hasFailures && (
                  <>
                    <button
                      onClick={handleRetry}
                      disabled={retrying}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg font-medium hover:opacity-90 transition-all disabled:opacity-50"
                    >
                      {retrying ? (
                        <>
                          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Retrying...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Retry Checks
                        </>
                      )}
                    </button>
                    {checks.auth?.status === 'fail' && (
                      <Link
                        href="/auth"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 dark:bg-red-500 text-white rounded-lg font-medium hover:opacity-90 transition-all"
                      >
                        Sign In
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                        </svg>
                      </Link>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Health Checks */}
          <div className="mb-10">
            <div className="text-xs text-gray-500 dark:text-gray-500 mb-4">
              {loading ? 'Running diagnostics...' : `${checkCount} checks completed`}
            </div>
            <div className="space-y-4">
              {Object.entries(checks).map(([key, check]) => (
                <div key={key} className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {getStatusIcon(check.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-white mb-0.5 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </div>
                    <div className={`text-sm ${
                      check.status === 'pass'
                        ? 'text-gray-500 dark:text-gray-500'
                        : check.status === 'fail'
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-gray-400 dark:text-gray-500'
                    }`}>
                      {check.message.replace('✅ ', '').replace('⚠️ ', '')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Debug Section */}
          {hasFailures && (
            <div className="mb-10 bg-gray-100 dark:bg-gray-800/50 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Debug Info</h3>
                <button
                  onClick={() => setShowDebug(!showDebug)}
                  className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                >
                  {showDebug ? 'Hide' : 'Show'}
                </button>
              </div>
              {showDebug && debugInfo && (
                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Token Exists:</span>
                    <span className={debugInfo.hasToken ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                      {debugInfo.hasToken ? 'Yes' : 'No'}
                    </span>
                  </div>
                  {debugInfo.hasToken && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Token Length:</span>
                        <span className="text-gray-900 dark:text-white">{debugInfo.tokenLength}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Expires At:</span>
                        <span className="text-gray-900 dark:text-white">{debugInfo.expiresAt || 'Unknown'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Is Expired:</span>
                        <span className={debugInfo.isExpired ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}>
                          {debugInfo.isExpired ? 'Yes' : 'No'}
                        </span>
                      </div>
                    </>
                  )}
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={handleClearAuth}
                      className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium"
                    >
                      Clear Auth Data
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quick Links */}
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-500 mb-4">Quick Links</div>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/compare"
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
              >
                Vote on Startups
              </Link>
              <Link
                href="/rankings"
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
              >
                View Rankings
              </Link>
              <Link
                href="/portfolio"
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
              >
                Your Portfolio
              </Link>
              <Link
                href="/leaderboard"
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
              >
                Leaderboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

