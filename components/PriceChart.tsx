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

type TimeRange = '30m' | '1h' | '6h' | '1d' | '1w'

const timeRangeOptions: { value: TimeRange; label: string }[] = [
  { value: '30m', label: '30 Min' },
  { value: '1h', label: '1 Hour' },
  { value: '6h', label: '6 Hours' },
  { value: '1d', label: '1 Day' },
  { value: '1w', label: '1 Week' },
]

export default function PriceChart({ startupId }: PriceChartProps) {
  const [priceHistory, setPriceHistory] = useState<PriceHistoryPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<TimeRange>('1d')

  useEffect(() => {
    loadPriceHistory()
  }, [startupId, timeRange])

  const loadPriceHistory = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/price-history/${startupId}?range=${timeRange}`)
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

  // Format data for chart with dynamic time formatting based on range
  const getTimeFormat = (range: TimeRange) => {
    switch (range) {
      case '30m':
      case '1h':
        return { hour: 'numeric', minute: '2-digit' } as const
      case '6h':
        return { hour: 'numeric', minute: '2-digit' } as const
      case '1d':
        return { month: 'short', day: 'numeric', hour: 'numeric' } as const
      case '1w':
        return { month: 'short', day: 'numeric' } as const
      default:
        return { month: 'short', day: 'numeric', hour: 'numeric' } as const
    }
  }

  const chartData = priceHistory.map(point => ({
    time: new Date(point.recorded_at).toLocaleString('en-US', getTimeFormat(timeRange)),
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
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Price History
          </h3>
          <div className="flex gap-1">
            {timeRangeOptions.map(option => (
              <button
                key={option.value}
                onClick={() => setTimeRange(option.value)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  timeRange === option.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
          No price history available yet. Price data is captured every 5 minutes.
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
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Price History
          </h3>
          <div className="flex gap-1">
            {timeRangeOptions.map(option => (
              <button
                key={option.value}
                onClick={() => setTimeRange(option.value)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  timeRange === option.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
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
        Price snapshots captured every 5 minutes. Data updates automatically.
      </p>
    </div>
  )
}

