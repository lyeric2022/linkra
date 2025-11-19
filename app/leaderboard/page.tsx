'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { User, Holding, Startup } from '@/lib/types/database'
import { calculatePrice } from '@/lib/utils/price'
import Link from 'next/link'
import { useAuthContext } from '@/lib/contexts/AuthContext'

interface LeaderboardEntry {
  user: User
  cash: number
  holdingsValue: number
  totalValue: number
  gainLoss: number
  gainLossPercent: number
  holdingsCount: number
  comparisonsCount: number
}

export default function LeaderboardPage() {
  const { user } = useAuthContext() // Use single source of truth
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadLeaderboard()
  }, [])

  const loadLeaderboard = async () => {
    try {
      setLoading(true)
      
      // Get all users
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (usersError) throw usersError

      // Get all holdings with startup details
      const { data: allHoldings, error: holdingsError } = await supabase
        .from('holdings')
        .select(`
          *,
          startup:startups(*)
        `)

      if (holdingsError) throw holdingsError

      // Get comparison counts per user
      const { data: comparisons, error: compError } = await supabase
        .from('pairwise_comparisons')
        .select('user_id')

      if (compError) throw compError

      // Count comparisons per user
      const comparisonCounts = new Map<string, number>()
      comparisons?.forEach(comp => {
        comparisonCounts.set(comp.user_id, (comparisonCounts.get(comp.user_id) || 0) + 1)
      })

      // Group holdings by user
      const holdingsByUser = new Map<string, (Holding & { startup: Startup })[]>()
      allHoldings?.forEach((holding: any) => {
        const userId = holding.user_id
        if (!holdingsByUser.has(userId)) {
          holdingsByUser.set(userId, [])
        }
        holdingsByUser.get(userId)!.push(holding as Holding & { startup: Startup })
      })

      // Calculate portfolio values for each user
      const leaderboardEntries: LeaderboardEntry[] = (users || []).map(user => {
        const holdings = holdingsByUser.get(user.id) || []
        
        // Calculate holdings value (longs have asset value, shorts have unrealized P&L)
        const holdingsValue = holdings.reduce((total, holding) => {
          const currentPrice = calculatePrice(holding.startup.elo_rating)
          const entryPrice = holding.average_cost
          const absQuantity = Math.abs(holding.quantity)
          
          if (holding.quantity > 0) {
            // Long position: asset value
            return total + (holding.quantity * currentPrice)
          } else {
            // Short position: unrealized P&L only
            const unrealizedPnL = (entryPrice - currentPrice) * absQuantity
            return total + unrealizedPnL
          }
        }, 0)

        const cash = user.virtual_currency || 0
        const totalValue = cash + holdingsValue
        const initialValue = 10000 // Starting currency
        const gainLoss = totalValue - initialValue
        const gainLossPercent = (gainLoss / initialValue) * 100

        return {
          user,
          cash,
          holdingsValue,
          totalValue,
          gainLoss,
          gainLossPercent,
          holdingsCount: holdings.length,
          comparisonsCount: comparisonCounts.get(user.id) || 0,
        }
      })

      // Sort by total value (descending)
      leaderboardEntries.sort((a, b) => b.totalValue - a.totalValue)

      setEntries(leaderboardEntries)
    } catch (error) {
      console.error('Error loading leaderboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
          1
        </div>
      )
    }
    if (rank === 2) {
      return (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center text-white font-bold text-sm shadow-sm">
          2
        </div>
      )
    }
    if (rank === 3) {
      return (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-300 to-orange-500 flex items-center justify-center text-white font-bold text-sm shadow-sm">
          3
        </div>
      )
    }
    return (
      <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-700 dark:text-gray-300 font-semibold text-sm">
        {rank}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-600 dark:text-gray-400">Loading leaderboard...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              Top Players
            </h1>
          </div>

          {/* Leaderboard Table */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Leaderboard</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {entries.length === 0 
                  ? 'No players yet' 
                  : `${entries.length} ${entries.length === 1 ? 'player' : 'players'}`
                }
              </p>
            </div>

            {entries.length === 0 ? (
              <div className="p-12 text-center">
                <svg className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-700 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <p className="text-gray-600 dark:text-gray-400 mb-2 font-medium">
                  No players yet
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
                  Start trading to appear on the leaderboard!
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
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        Rank
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        Player
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        Total Value
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        Gain/Loss
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        Cash
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        Holdings
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {entries.map((entry, index) => {
                      const rank = index + 1
                      const isCurrentUser = entry.user.id === user?.id
                      
                      return (
                        <tr
                          key={entry.user.id}
                          className={`transition-colors ${
                            isCurrentUser
                              ? 'bg-blue-50 dark:bg-blue-900/10 border-l-4 border-l-blue-500'
                              : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                          }`}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getRankBadge(rank)}
                          </td>
                          <td className="px-6 py-4">
                            <Link
                              href={`/player/${entry.user.id}`}
                              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                            >
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center text-sm font-semibold text-gray-700 dark:text-gray-300 flex-shrink-0">
                                {(entry.user.name || entry.user.email).charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
                                  {isCurrentUser ? (
                                    <>
                                      You
                                      <span className="text-xs px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                                        {entry.user.name || entry.user.email.split('@')[0]}
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      {entry.user.name || `Player ${rank}`}
                                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                      </svg>
                                    </>
                                  )}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-500">
                                  {entry.holdingsCount} {entry.holdingsCount === 1 ? 'holding' : 'holdings'} · {entry.comparisonsCount} {entry.comparisonsCount === 1 ? 'vote' : 'votes'}
                                </div>
                              </div>
                            </Link>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="text-lg font-bold text-gray-900 dark:text-white">
                              ${entry.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className={`text-sm font-semibold ${
                              entry.gainLoss >= 0
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-red-600 dark:text-red-400'
                            }`}>
                              {entry.gainLoss >= 0 ? '+' : ''}${entry.gainLoss.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div className={`text-xs ${
                              entry.gainLossPercent >= 0
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-red-600 dark:text-red-400'
                            }`}>
                              {entry.gainLossPercent >= 0 ? '+' : ''}{entry.gainLossPercent.toFixed(1)}%
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600 dark:text-gray-400">
                            ${entry.cash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600 dark:text-gray-400">
                            ${entry.holdingsValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

