'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Startup, Holding } from '@/lib/types/database'
import Link from 'next/link'
import { calculatePrice, formatPrice } from '@/lib/utils/price'
import PriceChart from '@/components/PriceChart'
import { useAuthContext } from '@/lib/contexts/AuthContext'

export default function StartupDetailPage() {
  const params = useParams()
  const startupId = params.id as string
  const { user } = useAuthContext() // Use single source of truth
  const [startup, setStartup] = useState<Startup | null>(null)
  const [holding, setHolding] = useState<Holding | null>(null)
  const [userCurrency, setUserCurrency] = useState<number>(0)
  const [tradeQuantity, setTradeQuantity] = useState<string>('1')
  const [tradeMode, setTradeMode] = useState<'long' | 'short'>('long') // 'long' for regular trades, 'short' for betting down
  const [tradeAction, setTradeAction] = useState<'buy' | 'sell'>('buy') // 'buy' or 'sell' within the current mode
  const [loading, setLoading] = useState(true)
  const [trading, setTrading] = useState(false)

  useEffect(() => {
    loadStartup()
  }, [startupId])

  const loadStartup = async () => {
    try {
      // Get startup
      const { data: startupData, error: startupError } = await supabase
        .from('startups')
        .select('*')
        .eq('id', startupId)
        .single()

      if (startupError) throw startupError
      
      // Get comparison count for this startup
      const { count: comparisonCount } = await supabase
        .from('pairwise_comparisons')
        .select('*', { count: 'exact', head: true })
        .or(`startup_a_id.eq.${startupId},startup_b_id.eq.${startupId}`)

      const enrichedStartup = {
        ...startupData,
        comparison_count: comparisonCount || 0,
      }
      
      setStartup(enrichedStartup as Startup)
    } catch (error) {
      console.error('Error loading startup:', error)
    } finally {
      setLoading(false)
    }
  }

  // Load user-specific data when user is available
  useEffect(() => {
    if (!user || !startupId) return

    const loadUserData = async () => {
      // Get user currency
      const { data: userData } = await supabase
        .from('users')
        .select('virtual_currency')
        .eq('id', user.id)
        .single()

      if (userData) {
        setUserCurrency(userData.virtual_currency)
      }

      // Get user's holding for this startup
      const { data: holdingData, error: holdingError } = await supabase
        .from('holdings')
        .select('*')
        .eq('user_id', user.id)
        .eq('startup_id', startupId)
        .maybeSingle() // Use maybeSingle() instead of single() - returns null if no row found

      if (holdingData && !holdingError) {
        setHolding(holdingData as Holding)
      }
      // If no holding exists, that's fine - user just hasn't traded this startup yet
    }

    loadUserData()
  }, [user, startupId])
  const handleTrade = async () => {
    if (!startup) return

    if (!user) {
      alert('Please sign in to trade')
      return
    }

    const quantity = parseInt(tradeQuantity)
    if (isNaN(quantity) || quantity <= 0) return

    const price = calculatePrice(startup.elo_rating)
    const totalCost = quantity * price
    const tradeType = getTradeType()

    console.log(`💰 [TRADE] ${tradeType.toUpperCase()}:`, {
      startup: startup.name,
      quantity,
      price,
      totalCost,
      mode: tradeMode,
      action: tradeAction,
    })

    setTrading(true)

    try {

      if (tradeType === 'buy') {
        // Buy long position (no mixing with shorts)
        if (holding && holding.quantity < 0) {
          alert('Close your short position first before going long')
          setTrading(false)
          return
        }
        
        if (userCurrency < totalCost) {
          console.warn('❌ [TRADE] Insufficient funds:', { userCurrency, totalCost })
          alert('Insufficient funds')
          setTrading(false)
          return
        }

        console.log('💾 [TRADE] Executing buy trade...')
        
        // 1. Create trade record
        const { data: tradeData, error: tradeError } = await supabase.from('trades').insert({
          user_id: user.id,
          startup_id: startupId,
          trade_type: 'buy',
          quantity,
          price,
          total_value: totalCost,
        }).select()

        if (tradeError) {
          console.error('❌ [TRADE] Error creating trade record:', tradeError)
          throw tradeError
        }
        console.log('✅ [TRADE] Trade record created:', tradeData?.[0]?.id)

        // 2. Update or create holding
        if (holding) {
          // Add to existing long position
          const newQuantity = holding.quantity + quantity
          const newAvgCost = ((holding.quantity * holding.average_cost) + totalCost) / newQuantity
          await supabase
            .from('holdings')
            .update({
              quantity: newQuantity,
              average_cost: newAvgCost,
            })
            .eq('id', holding.id)
        } else {
          await supabase.from('holdings').insert({
            user_id: user.id,
            startup_id: startupId,
            quantity,
            average_cost: price,
          })
        }

        // 3. Update user currency
        await supabase
          .from('users')
          .update({ virtual_currency: userCurrency - totalCost })
          .eq('id', user.id)

        console.log(`✅ [TRADE] Buy completed at $${price.toFixed(2)} per share`)
      } else if (tradeType === 'bet_down') {
        // Bet down (open short position) - no mixing with longs
        if (holding && holding.quantity > 0) {
          alert('Close your long position first before going short')
          setTrading(false)
          return
        }
        
        if (userCurrency < totalCost) {
          console.warn('❌ [TRADE] Insufficient funds:', { userCurrency, totalCost })
          alert('Insufficient funds')
          setTrading(false)
          return
        }

        console.log('💾 [TRADE] Executing bet down trade...')
        
        // 1. Create trade record
        const { data: tradeData, error: tradeError } = await supabase.from('trades').insert({
          user_id: user.id,
          startup_id: startupId,
          trade_type: 'bet_down',
          quantity,
          price,
          total_value: totalCost,
        }).select()

        if (tradeError) {
          console.error('❌ [TRADE] Error creating trade record:', tradeError)
          throw tradeError
        }
        console.log('✅ [TRADE] Trade record created:', tradeData?.[0]?.id)

        // 2. Update or create holding (add to existing short or create new)
        if (holding) {
          // Add to existing short position
          const newQuantity = holding.quantity - quantity // More negative
          const absOldQuantity = Math.abs(holding.quantity)
          const absNewQuantity = Math.abs(newQuantity)
          const newAvgCost = ((absOldQuantity * holding.average_cost) + totalCost) / absNewQuantity
          await supabase
            .from('holdings')
            .update({
              quantity: newQuantity,
              average_cost: newAvgCost,
            })
            .eq('id', holding.id)
        } else {
          await supabase.from('holdings').insert({
            user_id: user.id,
            startup_id: startupId,
            quantity: -quantity, // Negative for short
            average_cost: price,
          })
        }

        // 3. Update user currency
        await supabase
          .from('users')
          .update({ virtual_currency: userCurrency - totalCost })
          .eq('id', user.id)

        console.log(`✅ [TRADE] Bet down completed at $${price.toFixed(2)} per share`)
      } else if (tradeType === 'sell') {
        // Sell long position
        if (!holding || holding.quantity < quantity) {
          alert('Insufficient shares')
          setTrading(false)
          return
        }

        const proceeds = quantity * price

        // 1. Create trade record
        await supabase.from('trades').insert({
          user_id: user.id,
          startup_id: startupId,
          trade_type: 'sell',
          quantity,
          price,
          total_value: proceeds,
        })

        // 2. Update holding
        const newQuantity = holding.quantity - quantity
        if (newQuantity === 0) {
          await supabase.from('holdings').delete().eq('id', holding.id)
        } else {
          await supabase
            .from('holdings')
            .update({ quantity: newQuantity })
            .eq('id', holding.id)
        }

        // 3. Update user currency
        await supabase
          .from('users')
          .update({ virtual_currency: userCurrency + proceeds })
          .eq('id', user.id)

        console.log(`✅ [TRADE] Sell completed at $${price.toFixed(2)} per share`)
      } else if (tradeType === 'cover') {
        // Cover short position (close short)
        if (!holding || holding.quantity >= 0 || Math.abs(holding.quantity) < quantity) {
          alert('Insufficient short position to cover')
          setTrading(false)
          return
        }

        const exitPrice = price
        const entryPrice = holding.average_cost
        const absQuantity = Math.abs(holding.quantity)
        const coverQuantity = Math.min(quantity, absQuantity)
        
        // Calculate P&L: profit when price goes down
        const pnl = (entryPrice - exitPrice) * coverQuantity
        const originalPayment = entryPrice * coverQuantity
        const totalReceived = originalPayment + pnl

        console.log('💾 [TRADE] Executing cover trade...', {
          coverQuantity,
          entryPrice,
          exitPrice,
          pnl,
          totalReceived,
        })

        // 1. Create trade record
        await supabase.from('trades').insert({
          user_id: user.id,
          startup_id: startupId,
          trade_type: 'cover',
          quantity: coverQuantity,
          price: exitPrice,
          total_value: totalReceived,
        })

        // 2. Update holding
        const newQuantity = holding.quantity + coverQuantity // Adding positive to negative
        if (newQuantity === 0) {
          await supabase.from('holdings').delete().eq('id', holding.id)
        } else {
          await supabase
            .from('holdings')
            .update({ quantity: newQuantity })
            .eq('id', holding.id)
        }

        // 3. Update user currency (get back original payment + P&L)
        await supabase
          .from('users')
          .update({ virtual_currency: userCurrency + totalReceived })
          .eq('id', user.id)

        console.log(`✅ [TRADE] Cover completed at $${exitPrice.toFixed(2)} per share, P&L: ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}`)
      }

      // Reload data
      console.log('🔄 [TRADE] Reloading startup data...')
      await loadStartup()
      setTradeQuantity('1')
      console.log('✅ [TRADE] Trade completed successfully!')
    } catch (error) {
      console.error('❌ [TRADE] Error executing trade:', error)
      alert('Trade failed. Please try again.')
    } finally {
      setTrading(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  if (!startup) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">Startup not found</div>
      </div>
    )
  }

  const currentPrice = startup.elo_rating ? calculatePrice(startup.elo_rating) : 0
  const tradeQuantityNum = parseInt(tradeQuantity) || 0
  const totalCost = tradeQuantityNum * currentPrice
  
  // Determine max quantities based on mode and action
  const maxBuyable = currentPrice > 0 ? Math.floor(userCurrency / currentPrice) : 0
  const maxSellable = holding && holding.quantity > 0 ? holding.quantity : 0
  const maxShortBuyable = currentPrice > 0 ? Math.floor(userCurrency / currentPrice) : 0
  const maxShortSellable = holding && holding.quantity < 0 ? Math.abs(holding.quantity) : 0
  
  // Get current max based on mode and action
  const currentMax = tradeMode === 'long' 
    ? (tradeAction === 'buy' ? maxBuyable : maxSellable)
    : (tradeAction === 'buy' ? maxShortBuyable : maxShortSellable)
  
  // Map to actual trade type for handleTrade function
  const getTradeType = (): 'buy' | 'sell' | 'bet_down' | 'cover' => {
    if (tradeMode === 'long') {
      return tradeAction
    } else {
      return tradeAction === 'buy' ? 'bet_down' : 'cover'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="container mx-auto px-4 py-8">
        <Link 
          href="/rankings" 
          className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors mb-6"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Rankings
        </Link>

        <div className="max-w-6xl mx-auto">
          {/* Header Card */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 mb-6 shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                  {startup.name}
                </h1>
                <div className="flex items-center gap-3 flex-wrap">
                  {startup.elo_rating !== null && startup.elo_rating !== undefined && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                      <span className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                        Elo
                      </span>
                      <span className="text-base font-bold text-gray-900 dark:text-white">
                        {startup.elo_rating.toFixed(0)}
                      </span>
                    </div>
                  )}
                  {(startup as any).comparison_count !== undefined && (
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm text-gray-600 dark:text-gray-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>
                        {(startup as any).comparison_count} {(startup as any).comparison_count === 1 ? 'vote' : 'votes'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              {startup.website && (
                <a
                  href={startup.website.startsWith('http') ? startup.website : `https://${startup.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-black dark:bg-white text-white dark:text-black hover:opacity-90 transition-opacity font-medium text-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Website
                </a>
              )}
            </div>

            {/* Metadata Tags */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {startup.sector && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                  {startup.sector}
                </span>
              )}
              {startup.batch && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                  {startup.batch}
                </span>
              )}
              {startup.location && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                  {startup.location}
                </span>
              )}
            </div>

            {/* Description */}
            {startup.description && (
              <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm">
                  {startup.description}
                </p>
              </div>
            )}
          </div>

          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Trading Card - Takes 2 columns */}
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                  Market
                </h2>

                {/* Current Price */}
                <div className="mb-6 pb-6 border-b border-gray-200 dark:border-gray-800">
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-2">Current Price</div>
                  <div className="text-4xl font-bold text-gray-900 dark:text-white mb-1">
                    {formatPrice(startup.elo_rating)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-500">
                    Based on Elo rating: {startup.elo_rating?.toFixed(0) || '1500'}
                  </div>
                </div>

                {/* Your Holdings */}
                {holding && (
                  <div className="mb-6 pb-6 border-b border-gray-200 dark:border-gray-800">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-xs font-medium text-gray-500 dark:text-gray-500 uppercase tracking-wider">
                        {holding.quantity > 0 ? 'Your Position' : 'Your Short'}
                      </div>
                      {holding.quantity < 0 && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300">
                          Short
                        </span>
                      )}
                    </div>
                    <div className="flex items-baseline gap-2 mb-3">
                      <div className={`text-2xl font-bold ${
                        holding.quantity > 0 
                          ? 'text-gray-900 dark:text-white' 
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {holding.quantity > 0 ? '+' : ''}{holding.quantity}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">shares</div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-500 mb-1">Entry</div>
                        <div className="font-semibold text-gray-900 dark:text-white">
                          ${holding.average_cost.toFixed(2)}
                        </div>
                      </div>
                      {startup.elo_rating && (
                        <div>
                          <div className="text-xs text-gray-500 dark:text-gray-500 mb-1">Current</div>
                          <div className="font-semibold text-gray-900 dark:text-white">
                            ${calculatePrice(startup.elo_rating).toFixed(2)}
                          </div>
                        </div>
                      )}
                    </div>
                    {startup.elo_rating && (
                      <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Unrealized P&L</span>
                          {(() => {
                            const currentPrice = calculatePrice(startup.elo_rating)
                            const entryPrice = holding.average_cost
                            const absQuantity = Math.abs(holding.quantity)
                            let unrealizedPnL: number
                            
                            if (holding.quantity > 0) {
                              // Long position: profit when price goes up
                              unrealizedPnL = (currentPrice - entryPrice) * holding.quantity
                            } else {
                              // Short position: profit when price goes down
                              unrealizedPnL = (entryPrice - currentPrice) * absQuantity
                            }
                            
                            return (
                              <span className={`text-xl font-bold ${
                                unrealizedPnL >= 0
                                  ? 'text-green-600 dark:text-green-400'
                                  : 'text-red-600 dark:text-red-400'
                              }`}>
                                {unrealizedPnL >= 0 ? '+' : ''}${unrealizedPnL.toFixed(2)}
                              </span>
                            )
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Trade Section */}
                <div>
                  {/* Mode Selector */}
                  <div className="flex gap-2 mb-4">
                    <button
                      onClick={() => {
                        setTradeMode('long')
                        setTradeAction('buy')
                      }}
                      disabled={!!(holding && holding.quantity < 0)} // Can't trade long if you have shorts
                      className={`flex-1 px-4 py-2.5 rounded-lg font-semibold transition-all ${
                        tradeMode === 'long'
                          ? 'bg-black dark:bg-white text-white dark:text-black'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                      } ${holding && holding.quantity < 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      Trade
                    </button>
                    <button
                      onClick={() => {
                        setTradeMode('short')
                        setTradeAction('buy')
                      }}
                      disabled={!!(holding && holding.quantity > 0)} // Can't short if you have longs
                      className={`flex-1 px-4 py-2.5 rounded-lg font-semibold transition-all ${
                        tradeMode === 'short'
                          ? 'bg-red-600 dark:bg-red-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                      } ${holding && holding.quantity > 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      Short
                    </button>
                  </div>

                  {/* Buy/Sell Toggle */}
                  <div className="flex gap-2 mb-4 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                    <button
                      onClick={() => setTradeAction('buy')}
                      className={`flex-1 px-4 py-2 rounded-md font-medium transition-all ${
                        tradeAction === 'buy'
                          ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                      }`}
                    >
                      Buy {tradeMode === 'short' ? '↓' : '↑'}
                    </button>
                    <button
                      onClick={() => setTradeAction('sell')}
                      disabled={
                        (tradeMode === 'long' && (!holding || holding.quantity <= 0)) ||
                        (tradeMode === 'short' && (!holding || holding.quantity >= 0))
                      }
                      className={`flex-1 px-4 py-2 rounded-md font-medium transition-all ${
                        tradeAction === 'sell'
                          ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                      } ${
                        ((tradeMode === 'long' && (!holding || holding.quantity <= 0)) ||
                        (tradeMode === 'short' && (!holding || holding.quantity >= 0))) 
                          ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      Sell
                    </button>
                  </div>

                  {/* Quantity Input */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Quantity
                    </label>
                    <input
                      type="number"
                      value={tradeQuantity}
                      onChange={(e) => setTradeQuantity(e.target.value)}
                      min="1"
                      max={currentMax}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent transition-all"
                      placeholder="Enter quantity"
                    />
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                      Max: {currentMax} shares
                    </div>
                  </div>

                  {/* Total Cost/Info */}
                  {startup.elo_rating && (
                    <div className={`mb-4 p-4 rounded-lg ${
                      tradeMode === 'short' 
                        ? 'bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/50'
                        : 'bg-gray-50 dark:bg-gray-800/50'
                    }`}>
                      {tradeAction === 'buy' && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            {tradeMode === 'short' ? 'You\'ll pay' : 'Total'}
                          </span>
                          <span className="text-2xl font-bold text-gray-900 dark:text-white">
                            ${((parseInt(tradeQuantity) || 0) * currentPrice).toFixed(2)}
                          </span>
                        </div>
                      )}
                      {tradeAction === 'sell' && (
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">You'll receive</span>
                            <span className="text-2xl font-bold text-gray-900 dark:text-white">
                              ${((parseInt(tradeQuantity) || 0) * currentPrice).toFixed(2)}
                            </span>
                          </div>
                          {tradeMode === 'short' && tradeAction === 'sell' && holding && (
                            <div className="pt-2 border-t border-gray-200 dark:border-gray-700 space-y-1.5 text-xs">
                              {(() => {
                                const entryPrice = holding.average_cost
                                const exitPrice = currentPrice
                                const absQuantity = Math.abs(holding.quantity)
                                const coverQty = Math.min(parseInt(tradeQuantity) || 0, absQuantity)
                                const pnl = (entryPrice - exitPrice) * coverQty
                                const originalPayment = entryPrice * coverQty
                                const totalReceived = originalPayment + pnl
                                return (
                                  <>
                                    <div className="flex justify-between">
                                      <span className="text-gray-500 dark:text-gray-500">Entry</span>
                                      <span className="font-medium text-gray-900 dark:text-white">${entryPrice.toFixed(2)} × {coverQty}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-500 dark:text-gray-500">P&L</span>
                                      <span className={`font-semibold ${pnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                        {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                                      </span>
                                    </div>
                                    <div className="flex justify-between pt-1.5 border-t border-gray-200 dark:border-gray-700">
                                      <span className="font-medium text-gray-700 dark:text-gray-300">Total</span>
                                      <span className="font-bold text-gray-900 dark:text-white">${totalReceived.toFixed(2)}</span>
                                    </div>
                                  </>
                                )
                              })()}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Trade Button */}
                  <button
                    onClick={handleTrade}
                    disabled={
                      trading || 
                      !startup.elo_rating || 
                      (tradeMode === 'long' && tradeAction === 'sell' && (!holding || holding.quantity <= 0)) ||
                      (tradeMode === 'short' && tradeAction === 'sell' && (!holding || holding.quantity >= 0)) ||
                      (tradeAction === 'buy' && userCurrency < totalCost)
                    }
                    className={`w-full px-6 py-3 rounded-lg font-semibold hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                      tradeMode === 'short'
                        ? 'bg-red-600 dark:bg-red-500 text-white'
                        : 'bg-black dark:bg-white text-white dark:text-black'
                    }`}
                  >
                    {trading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing...
                      </span>
                    ) : (
                      tradeAction === 'buy' 
                        ? (tradeMode === 'short' ? 'Bet Down ↓' : 'Buy Shares ↑')
                        : (tradeMode === 'short' ? 'Cover Short' : 'Sell Shares')
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Stats Card - Takes 1 column */}
            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Stats
                </h2>
                <dl className="space-y-4">
                  <div className="pb-4 border-b border-gray-200 dark:border-gray-800">
                    <dt className="text-xs font-medium text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-1">Elo Rating</dt>
                    <dd className="text-2xl font-bold text-gray-900 dark:text-white">
                      {startup.elo_rating?.toFixed(0) || '1500'}
                    </dd>
                  </div>
                  <div className="pb-4 border-b border-gray-200 dark:border-gray-800">
                    <dt className="text-xs font-medium text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-1">Votes</dt>
                    <dd className="text-2xl font-bold text-gray-900 dark:text-white">
                      {(startup as any).comparison_count || 0}
                    </dd>
                  </div>
                  {startup.sector && (
                    <div>
                      <dt className="text-xs font-medium text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-1">Sector</dt>
                      <dd className="text-base font-medium text-gray-900 dark:text-white">
                        {startup.sector}
                      </dd>
                    </div>
                  )}
                  {startup.location && (
                    <div>
                      <dt className="text-xs font-medium text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-1">Location</dt>
                      <dd className="text-base font-medium text-gray-900 dark:text-white">
                        {startup.location}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>
          </div>

          {/* Price History Chart */}
          <div className="mt-6">
            <PriceChart startupId={startupId} />
          </div>
        </div>
      </div>
    </div>
  )
}

