'use client'

import { useState } from 'react'
import { usePostHog } from 'posthog-js/react'

interface RollButtonProps {
  userId: string
  freeGiftsCount: number
  onRollComplete: () => void
}

export default function RollButton({ userId, freeGiftsCount, onRollComplete }: RollButtonProps) {
  const posthog = usePostHog()
  const [isRolling, setIsRolling] = useState(false)
  const [diceValue, setDiceValue] = useState(1)
  const [result, setResult] = useState<{ startupName: string; shares: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [remainingGifts, setRemainingGifts] = useState(freeGiftsCount)

  // Animate dice rolling with linear slowdown
  const animateDice = (onComplete: () => void) => {
    const startDelay = 50 // Start fast: 50ms between changes
    const endDelay = 400 // End slow: 400ms between changes
    const totalIterations = 30 // Number of dice changes
    
    let iteration = 0
    
    const rollNext = () => {
      if (iteration >= totalIterations) {
        onComplete()
        return
      }
      
      // Calculate progress (0 to 1)
      const progress = iteration / totalIterations
      
      // Linear interpolation: delay increases from startDelay to endDelay
      const currentDelay = startDelay + (endDelay - startDelay) * progress
      
      // Update dice value
      setDiceValue(Math.floor(Math.random() * 6) + 1)
      
      iteration++
      
      // Schedule next roll with calculated delay
      setTimeout(rollNext, currentDelay)
    }
    
    // Start rolling
    rollNext()
  }

  const handleRoll = async () => {
    if (remainingGifts <= 0) {
      setError('No free gifts remaining')
      return
    }

    setIsRolling(true)
    setError(null)
    setResult(null)
    
    try {
      // Start animation and wait for it to complete (6 seconds)
      await new Promise<void>(resolve => {
        animateDice(resolve)
      })

      // Make API call after animation completes
      const response = await fetch('/api/roll', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Track failed roll
        posthog.capture('roll_failed', {
          error: data.error,
          remaining_gifts: freeGiftsCount,
        })
        throw new Error(data.error || 'Failed to roll')
      }

      setResult({
        startupName: data.startup.name,
        shares: data.shares,
      })

      // Update remaining gifts count
      setRemainingGifts(data.remainingGifts)

      // Track successful roll (client-side confirmation)
      posthog.capture('roll_completed_client', {
        startup_name: data.startup.name,
        shares: data.shares,
        remaining_gifts: data.remainingGifts,
      })

      // Refresh portfolio after roll
      onRollComplete()
    } catch (err: any) {
      console.error('❌ [ROLL] Error:', err)
      setError(err.message || 'Failed to roll')
    } finally {
      setIsRolling(false)
    }
  }

  // Dice face SVG component
  const DiceFace = ({ value }: { value: number }) => {
    const positions: { [key: number]: number[][] } = {
      1: [[50, 50]],
      2: [[25, 25], [75, 75]],
      3: [[25, 25], [50, 50], [75, 75]],
      4: [[25, 25], [75, 25], [25, 75], [75, 75]],
      5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
      6: [[25, 25], [25, 50], [25, 75], [75, 25], [75, 50], [75, 75]],
    }

    return (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <rect
          x="5"
          y="5"
          width="90"
          height="90"
          rx="10"
          fill="currentColor"
          className="text-white dark:text-gray-900"
        />
        {positions[value]?.map(([x, y], i) => (
          <circle
            key={i}
            cx={x}
            cy={y}
            r="6"
            fill="currentColor"
            className="text-gray-900 dark:text-white"
          />
        ))}
      </svg>
    )
  }

  if (remainingGifts <= 0) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-6 text-center border border-gray-200 dark:border-gray-700">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No free gifts remaining
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <button
        onClick={handleRoll}
        disabled={isRolling || remainingGifts <= 0}
        className={`
          w-full px-6 py-4 rounded-xl font-medium
          transition-all duration-200
          flex items-center justify-center gap-3
          ${isRolling
            ? 'bg-gray-200 dark:bg-gray-700 cursor-not-allowed text-gray-500 dark:text-gray-400'
            : 'bg-black dark:bg-white text-white dark:text-black hover:opacity-90 active:scale-95 shadow-sm hover:shadow-md'
          }
        `}
      >
        {isRolling ? (
          <>
            <div className="w-8 h-8 flex-shrink-0">
              <DiceFace value={diceValue} />
            </div>
            <span>Rolling...</span>
          </>
        ) : (
          <>
            <div className="w-6 h-6 flex-shrink-0">
              <DiceFace value={6} />
            </div>
            <span>Roll for Free Gift</span>
            <span className="text-xs opacity-70 ml-auto">({remainingGifts} left)</span>
          </>
        )}
      </button>

      {result && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <p className="text-green-800 dark:text-green-200 font-medium">
            You got {result.shares} shares of <span className="font-semibold">{result.startupName}</span>
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
        </div>
      )}
    </div>
  )
}

