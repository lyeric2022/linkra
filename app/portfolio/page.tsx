'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Holding, Startup, User } from '@/lib/types/database'
import Link from 'next/link'
import RollButton from '@/components/RollButton'
import { useAuthContext } from '@/lib/contexts/AuthContext'
import { calculatePrice } from '@/lib/utils/price'

export default function PortfolioPage() {
  const [holdings, setHoldings] = useState<(Holding & { startup: Startup })[]>([])
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState<string>('Loading portfolio...')
  
  // AuthGuard handles auth - we can assume user exists on protected routes
  const { user, userProfile } = useAuthContext()

  useEffect(() => {
    // Middleware ensures user exists, so we can load immediately
    if (user) {
      // Initial load
      loadPortfolio(true)
      
      // Refresh every 30 seconds for updated prices
      const interval = setInterval(() => {
        loadPortfolio(false)
      }, 30000)
      
      return () => clearInterval(interval)
    }
  }, [user])

  const loadPortfolio = async (isInitialLoad = false) => {
    if (!user) return
    
    try {
      // Only show main loading spinner on initial load, not on refreshes
      if (isInitialLoad) {
        setLoading(true)
        setLoadingMessage('Fetching your holdings...')
      } else {
        setIsRefreshing(true)
      }

      setLoadingMessage('Loading startup details...')
      
      // Get holdings with startup details
      const { data: holdingsData, error: holdingsError } = await supabase
        .from('holdings')
        .select(`
          *,
          startup:startups(*)
        `)
        .eq('user_id', user.id)

      if (holdingsError) throw holdingsError
      
      setLoadingMessage('Calculating portfolio value...')
      setHoldings((holdingsData as any) || [])
    } catch (error) {
      console.error('Error loading portfolio:', error)
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  const calculatePortfolioValue = () => {
    return holdings.reduce((total, holding) => {
      const currentPrice = calculatePrice(holding.startup.elo_rating)
      const entryPrice = holding.average_cost
      const absQuantity = Math.abs(holding.quantity)
      
      if (holding.quantity > 0) {
        // Long position: value = quantity * current_price
        return total + (holding.quantity * currentPrice)
      } else {
        // Short position: unrealized P&L only (no asset value, just profit/loss)
        const unrealizedPnL = (entryPrice - currentPrice) * absQuantity
        return total + unrealizedPnL
      }
    }, 0)
  }

  // Show loading state while data is loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white mb-4"></div>
          <div className="text-gray-600 dark:text-gray-400 font-medium">{loadingMessage}</div>
        </div>
      </div>
    )
  }

  const portfolioValue = calculatePortfolioValue()
  const totalValue = (userProfile?.virtual_currency || 0) + portfolioValue
  
  // Calculate total gain/loss (for longs: current - cost, for shorts: entry - current)
  const totalGainLoss = holdings.reduce((sum, holding) => {
    const currentPrice = calculatePrice(holding.startup.elo_rating)
    const entryPrice = holding.average_cost
    const absQuantity = Math.abs(holding.quantity)
    
    if (holding.quantity > 0) {
      // Long: profit when price goes up
      return sum + ((currentPrice - entryPrice) * holding.quantity)
    } else {
      // Short: profit when price goes down
      return sum + ((entryPrice - currentPrice) * absQuantity)
    }
  }, 0)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Your Portfolio</h1>
            <p className="text-gray-600 dark:text-gray-400">Track your investments and performance</p>
          </div>

          {/* Summary Cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Cash</div>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                ${(userProfile?.virtual_currency || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Holdings Value</div>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                ${portfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              {totalGainLoss !== 0 && (
                <div className={`text-sm mt-1 ${totalGainLoss >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {totalGainLoss >= 0 ? '+' : ''}${totalGainLoss.toFixed(2)}
                </div>
              )}
            </div>

            <div className="bg-gradient-to-br from-gray-900 to-gray-800 dark:from-white dark:to-gray-100 rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-white/80 dark:text-gray-600">Total Value</div>
                <svg className="w-5 h-5 text-white/60 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="text-3xl font-bold text-white dark:text-gray-900">
                ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* Free Gift Roll Section */}
          {user && userProfile && (userProfile.free_gifts_count || 0) > 0 && (
            <div className="mb-8">
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Free Gift Roll</h2>
                <RollButton
                  userId={user.id}
                  freeGiftsCount={userProfile.free_gifts_count || 5}
                  onRollComplete={loadPortfolio}
                />
              </div>
            </div>
          )}

          {/* Holdings Section */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Your Holdings</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {holdings.length === 0 
                  ? 'No holdings yet' 
                  : `${holdings.length} ${holdings.length === 1 ? 'holding' : 'holdings'}`
                }
              </p>
            </div>

            {holdings.length === 0 ? (
              <div className="p-12 text-center">
                <svg className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-700 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <p className="text-gray-600 dark:text-gray-400 mb-2 font-medium">
                  You don't have any holdings yet
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
                  Start trading to build your portfolio
                </p>
                <Link
                  href="/rankings"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-lg font-semibold hover:opacity-90 transition-all"
                >
                  Browse Startups
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-800">
                {holdings.map((holding) => {
                  const currentPrice = calculatePrice(holding.startup.elo_rating)
                  const entryPrice = holding.average_cost
                  const absQuantity = Math.abs(holding.quantity)
                  const isLong = holding.quantity > 0
                  
                  // Calculate value and P&L based on position type
                  let currentValue: number
                  let costBasis: number
                  let gainLoss: number
                  
                  if (isLong) {
                    // Long position
                    currentValue = holding.quantity * currentPrice
                    costBasis = holding.quantity * entryPrice
                    gainLoss = currentValue - costBasis
                  } else {
                    // Short position - no asset value, just unrealized P&L
                    currentValue = 0 // Shorts don't have asset value
                    costBasis = absQuantity * entryPrice // Original payment
                    gainLoss = (entryPrice - currentPrice) * absQuantity // Profit when price goes down
                  }
                  
                  // Calculate percentage gain/loss
                  let gainLossPercent: number | null = null
                  if (costBasis > 0) {
                    gainLossPercent = (gainLoss / costBasis) * 100
                  } else if (costBasis === 0 && currentValue > 0) {
                    gainLossPercent = 100 // Gift shares
                  }

                  return (
                    <Link
                      key={holding.id}
                      href={`/startup/${holding.startup.id}`}
                      className="block p-6 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white hover:underline">
                              {holding.startup.name}
                            </h3>
                            {holding.average_cost === 0 && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border border-purple-200/50 dark:border-purple-800/50">
                                Gift
                              </span>
                            )}
                            {!isLong && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200/50 dark:border-red-800/50">
                                Short
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 flex-wrap">
                            <div className={`text-sm font-medium ${
                              isLong 
                                ? 'text-gray-600 dark:text-gray-400' 
                                : 'text-red-600 dark:text-red-400'
                            }`}>
                              {isLong ? '+' : ''}{holding.quantity} shares
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              Entry: <span className="font-medium">${entryPrice.toFixed(2)}</span>
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              Current: <span className="font-medium">${currentPrice.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right ml-6">
                          {isLong ? (
                            <>
                              <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                                ${currentValue.toFixed(2)}
                              </div>
                              {gainLossPercent !== null && (
                                <div className={`text-sm font-semibold ${
                                  gainLoss >= 0 
                                    ? 'text-green-600 dark:text-green-400' 
                                    : 'text-red-600 dark:text-red-400'
                                }`}>
                                  {gainLoss >= 0 ? '+' : ''}${gainLoss.toFixed(2)}
                                  <span className="ml-1">
                                    ({gainLossPercent >= 0 ? '+' : ''}{gainLossPercent.toFixed(1)}%)
                                  </span>
                                </div>
                              )}
                            </>
                          ) : (
                            <>
                              <div className="text-sm text-gray-500 dark:text-gray-500 mb-1">
                                Short Position
                              </div>
                              <div className={`text-xl font-bold mb-1 ${
                                gainLoss >= 0 
                                  ? 'text-green-600 dark:text-green-400' 
                                  : 'text-red-600 dark:text-red-400'
                              }`}>
                                {gainLoss >= 0 ? '+' : ''}${gainLoss.toFixed(2)}
                              </div>
                              {gainLossPercent !== null && (
                                <div className={`text-sm font-semibold ${
                                  gainLoss >= 0 
                                    ? 'text-green-600 dark:text-green-400' 
                                    : 'text-red-600 dark:text-red-400'
                                }`}>
                                  ({gainLossPercent >= 0 ? '+' : ''}{gainLossPercent.toFixed(1)}%)
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

