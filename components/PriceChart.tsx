'use client'

import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface PriceHistoryPoint {
  id: string
  startup_id: string
  elo_rating: number
  price: number
  recorded_at: string
}

interface PriceChartProps {
  startupId: string
}

export default function PriceChart({ startupId }: PriceChartProps) {
  const [priceHistory, setPriceHistory] = useState<PriceHistoryPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPriceHistory()
  }, [startupId])

  const loadPriceHistory = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/price-history/${startupId}`)
      const data = await response.json()

      if (data.success) {
        setPriceHistory(data.data || [])
      }
    } catch (error) {
      console.error('Error loading price history:', error)
    } finally {
      setLoading(false)
    }
  }

  // Format data for chart
  const chartData = priceHistory.map(point => ({
    time: new Date(point.recorded_at).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
    }),
    price: parseFloat(point.price.toFixed(2)),
    elo: parseFloat(point.elo_rating.toFixed(0)),
    timestamp: point.recorded_at,
  }))

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <div className="text-center text-gray-500 dark:text-gray-400">
          Loading price history...
        </div>
      </div>
    )
  }

  if (chartData.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Price History
        </h3>
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
          No price history available yet. Check back in an hour!
        </div>
      </div>
    )
  }

  // Calculate price change
  const firstPrice = chartData[0]?.price || 0
  const lastPrice = chartData[chartData.length - 1]?.price || 0
  const priceChange = lastPrice - firstPrice
  const priceChangePercent = firstPrice > 0 ? ((priceChange / firstPrice) * 100).toFixed(2) : '0.00'

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Price History (Last 7 Days)
        </h3>
        <div className="flex items-center gap-4 text-sm">
          <div>
            <span className="text-gray-600 dark:text-gray-400">Current: </span>
            <span className="font-semibold text-gray-900 dark:text-white">
              ${lastPrice.toFixed(2)}
            </span>
          </div>
          {priceChange !== 0 && (
            <div>
              <span className="text-gray-600 dark:text-gray-400">Change: </span>
              <span className={`font-semibold ${priceChange >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {priceChange >= 0 ? '+' : ''}${priceChange.toFixed(2)} ({priceChangePercent}%)
              </span>
            </div>
          )}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
          <XAxis
            dataKey="time"
            className="text-xs text-gray-600 dark:text-gray-400"
            tick={{ fill: 'currentColor' }}
          />
          <YAxis
            className="text-xs text-gray-600 dark:text-gray-400"
            tick={{ fill: 'currentColor' }}
            domain={['auto', 'auto']}
            tickFormatter={(value) => `$${value.toFixed(2)}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '0.5rem',
            }}
            labelStyle={{ color: '#374151' }}
            formatter={(value: number) => [`$${value.toFixed(2)}`, 'Price']}
          />
          <Line
            type="monotone"
            dataKey="price"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>

      <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 text-center">
        Price snapshots captured hourly. Data updates every hour.
      </p>
    </div>
  )
}

