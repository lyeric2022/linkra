'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Holding, Startup, User, Trade } from '@/lib/types/database'
import Link from 'next/link'
import { calculatePrice } from '@/lib/utils/price'
import { useAuthContext } from '@/lib/contexts/AuthContext'

export default function PlayerProfilePage() {
  const params = useParams()
  const userName = decodeURIComponent(params.userId as string) // userId param is actually the username
  const { user: currentUser } = useAuthContext() // Use single source of truth
  const [user, setUser] = useState<User | null>(null)
  const [holdings, setHoldings] = useState<(Holding & { startup: Startup })[]>([])
  const [trades, setTrades] = useState<(Trade & { startup: Startup })[]>([])
  const [loading, setLoading] = useState(true)
  const [userRank, setUserRank] = useState<number | null>(null)

  useEffect(() => {
    loadProfile()
    loadUserRank()
  }, [userName])

  const loadUserRank = async () => {
    try {
      // Get all users with their portfolio values
      const { data: users } = await supabase.from('users').select('id, name, virtual_currency')
      
      if (!users) return

      // Get all holdings
      const { data: allHoldings } = await supabase
        .from('holdings')
        .select(`
          *,
          startup:startups(*)
        `)

      // Calculate portfolio values
      const portfolioValues = new Map<string, number>()
      
      users.forEach(user => {
        const userHoldings = (allHoldings || []).filter((h: any) => h.user_id === user.id)
        const holdingsValue = userHoldings.reduce((total: number, holding: any) => {
          const currentPrice = calculatePrice(holding.startup.elo_rating)
          const entryPrice = holding.average_cost
          const absQuantity = Math.abs(holding.quantity)
          
          if (holding.quantity > 0) {
            return total + (holding.quantity * currentPrice)
          } else {
            const unrealizedPnL = (entryPrice - currentPrice) * absQuantity
            return total + unrealizedPnL
          }
        }, 0)
        
        const totalValue = (user.virtual_currency || 0) + holdingsValue
        portfolioValues.set(user.id, totalValue)
      })

      // Sort by total value descending
      const sortedUsers = [...users].sort((a, b) => {
        const valueA = portfolioValues.get(a.id) || 0
        const valueB = portfolioValues.get(b.id) || 0
        return valueB - valueA
      })

      // Find rank by name
      const rank = sortedUsers.findIndex(u => u.name === userName) + 1
      setUserRank(rank > 0 ? rank : null)
    } catch (error) {
      console.error('Error loading user rank:', error)
    }
  }

  const loadProfile = async () => {
    try {
      setLoading(true)

      // Get user info by name
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('name', userName)
        .maybeSingle()

      if (userError) throw userError
      if (!userData) {
        console.error('User not found:', userName)
        return
      }
      setUser(userData)

      // Get holdings with startup details (use actual user id from userData)
      const { data: holdingsData, error: holdingsError } = await supabase
        .from('holdings')
        .select(`
          *,
          startup:startup_id(*)
        `)
        .eq('user_id', userData.id)
        .order('created_at', { ascending: false })

      if (holdingsError) throw holdingsError
      setHoldings((holdingsData as any) || [])

      // Get trades with startup details (use actual user id from userData)
      const { data: tradesData, error: tradesError } = await supabase
        .from('trades')
        .select(`
          *,
          startup:startup_id(*)
        `)
        .eq('user_id', userData.id)
        .order('created_at', { ascending: false })
        .limit(50) // Limit to recent 50 trades

      if (tradesError) throw tradesError
      setTrades((tradesData as any) || [])
    } catch (error: any) {
      console.error('Error loading profile:', error?.message || error)
    } finally {
      setLoading(false)
    }
  }

  const calculatePortfolioValue = () => {
    return holdings.reduce((total, holding) => {
      const currentPrice = calculatePrice(holding.startup.elo_rating)
      const entryPrice = holding.average_cost
      const absQuantity = Math.abs(holding.quantity)
      
      if (holding.quantity > 0) {
        return total + (holding.quantity * currentPrice)
      } else {
        const unrealizedPnL = (entryPrice - currentPrice) * absQuantity
        return total + unrealizedPnL
      }
    }, 0)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-600 dark:text-gray-400">Loading profile...</div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-600 dark:text-gray-400 mb-4">Player not found</div>
          <Link
            href="/leaderboard"
            className="inline-flex items-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg font-medium hover:opacity-90 transition-all"
          >
            Back to Leaderboard
          </Link>
        </div>
      </div>
    )
  }

  const portfolioValue = calculatePortfolioValue()
  const totalValue = (user.virtual_currency || 0) + portfolioValue
  const initialValue = 10000
  const gainLoss = totalValue - initialValue
  const gainLossPercent = (gainLoss / initialValue) * 100

  const isCurrentUser = currentUser?.id === user?.id

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link
              href="/leaderboard"
              className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors mb-4"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Leaderboard
            </Link>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 dark:from-indigo-600 dark:to-purple-700 flex items-center justify-center text-2xl font-bold text-white">
                {(user.name || user.email).charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-1">
                  {isCurrentUser ? 'Your Profile' : user.name || user.email.split('@')[0]}
                </h1>
                {userRank && (
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <span className="font-semibold">Rank #{userRank}</span>
                    <span>·</span>
                    <span>{trades.length} {trades.length === 1 ? 'trade' : 'trades'}</span>
                    <span>·</span>
                    <span>{holdings.length} {holdings.length === 1 ? 'holding' : 'holdings'}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">Portfolio Value</div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">Cash</div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                ${(user.virtual_currency || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">Gain/Loss</div>
              <div className={`text-3xl font-bold ${gainLoss >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {gainLoss >= 0 ? '+' : ''}${gainLoss.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className={`text-sm font-medium mt-1 ${gainLossPercent >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {gainLossPercent >= 0 ? '+' : ''}{gainLossPercent.toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Holdings */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm mb-6">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Holdings</h2>
            </div>
            {holdings.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-gray-600 dark:text-gray-400">No holdings yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-800">
                {holdings.map((holding) => {
                  const currentPrice = calculatePrice(holding.startup.elo_rating)
                  const entryPrice = holding.average_cost
                  const absQuantity = Math.abs(holding.quantity)
                  const isLong = holding.quantity > 0
                  
                  let currentValue: number
                  let gainLoss: number
                  
                  if (isLong) {
                    currentValue = holding.quantity * currentPrice
                    gainLoss = (currentPrice - entryPrice) * holding.quantity
                  } else {
                    currentValue = 0
                    gainLoss = (entryPrice - currentPrice) * absQuantity
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
                            {!isLong && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200/50 dark:border-red-800/50">
                                Short
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 flex-wrap">
                            <div className={`text-sm font-medium ${isLong ? 'text-gray-600 dark:text-gray-400' : 'text-red-600 dark:text-red-400'}`}>
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
                              <div className={`text-sm font-semibold ${gainLoss >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                {gainLoss >= 0 ? '+' : ''}${gainLoss.toFixed(2)}
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="text-sm text-gray-500 dark:text-gray-500 mb-1">Short Position</div>
                              <div className={`text-xl font-bold ${gainLoss >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                {gainLoss >= 0 ? '+' : ''}${gainLoss.toFixed(2)}
                              </div>
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

          {/* Trade History */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Recent Trades</h2>
            </div>
            {trades.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-gray-600 dark:text-gray-400">No trades yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Time</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Startup</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Quantity</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Price</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {trades.map((trade) => {
                      const tradeTypeLabels: Record<string, string> = {
                        'buy': 'Buy',
                        'sell': 'Sell',
                        'bet_down': 'Bet Down',
                        'cover': 'Cover'
                      }
                      
                      const isShort = trade.trade_type === 'bet_down' || trade.trade_type === 'cover'
                      
                      return (
                        <tr key={trade.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                            {new Date(trade.created_at).toLocaleDateString()} {new Date(trade.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="px-6 py-4">
                            <Link
                              href={`/startup/${trade.startup.id}`}
                              className="text-sm font-medium text-gray-900 dark:text-white hover:underline"
                            >
                              {trade.startup.name}
                            </Link>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              isShort
                                ? 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300'
                                : trade.trade_type === 'buy'
                                ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300'
                            }`}>
                              {tradeTypeLabels[trade.trade_type] || trade.trade_type}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900 dark:text-white">
                            {trade.quantity}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600 dark:text-gray-400">
                            ${trade.price.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-gray-900 dark:text-white">
                            ${trade.total_value.toFixed(2)}
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

