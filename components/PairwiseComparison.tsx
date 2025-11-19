'use client'

import { useState, useEffect, useRef } from 'react'
import { Startup } from '@/lib/types/database'
import StartupCard from './StartupCard'
import { supabase } from '@/lib/supabase/client'
import { animateNumber } from '@/lib/utils/animateNumber'
import { ensureUserRecord } from '@/lib/utils/ensureUserRecord'

interface PairwiseComparisonProps {
  startupA: Startup & { comparison_count?: number }
  startupB: Startup & { comparison_count?: number }
  userId: string
  onComparisonComplete?: () => void
}

// Elo calculation constants (matching API route)
const K_FACTOR = 32
const INITIAL_RATING = 1500

function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400))
}

function calculateNewElo(ratingA: number, ratingB: number, aWon: boolean): [number, number] {
  const expectedA = expectedScore(ratingA, ratingB)
  const expectedB = 1 - expectedA
  
  const actualA = aWon ? 1 : 0
  const actualB = 1 - actualA
  
  const newRatingA = ratingA + K_FACTOR * (actualA - expectedA)
  const newRatingB = ratingB + K_FACTOR * (actualB - expectedB)
  
  return [newRatingA, newRatingB]
}

export default function PairwiseComparison({
  startupA,
  startupB,
  userId,
  onComparisonComplete
}: PairwiseComparisonProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [animationComplete, setAnimationComplete] = useState(false)
  const [animatedEloA, setAnimatedEloA] = useState<number | null>(null)
  const [animatedEloB, setAnimatedEloB] = useState<number | null>(null)
  const [deltaA, setDeltaA] = useState<number | null>(null)
  const [deltaB, setDeltaB] = useState<number | null>(null)
  const [comparisonCountA, setComparisonCountA] = useState<number>(startupA.comparison_count || 0)
  const [comparisonCountB, setComparisonCountB] = useState<number>(startupB.comparison_count || 0)
  const completionCalledRef = useRef(false)
  const voteRecordedRef = useRef(false) // Track if vote has been recorded to prevent duplicates

  const handleSelect = async (startupId: string) => {
    // Prevent multiple votes: check if already submitting, animating, selected, or vote already recorded
    if (isSubmitting || isAnimating || selected !== null || voteRecordedRef.current) {
      console.log('⚠️ [COMPARE] Vote blocked - already voted or in progress')
      return
    }
    
    // Mark vote as being recorded immediately to prevent double-clicks
    voteRecordedRef.current = true
    
    const startTime = performance.now()
    setSelected(startupId)
    setIsSubmitting(true)

    try {
      // Ensure user record exists before creating comparison (prevents FK error)
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await ensureUserRecord(user.id, user.email || '')
      }
      
      console.log('📊 [COMPARE] User comparison:', {
        user: userId.substring(0, 8) + '...',
        startupA: startupA.name,
        startupB: startupB.name,
        chosen: startupId === startupA.id ? startupA.name : startupB.name,
      })
      
      // Record the pairwise comparison
      const comparisonStart = performance.now()
      const { data, error } = await supabase
        .from('pairwise_comparisons')
        .insert({
          user_id: userId,
          startup_a_id: startupA.id,
          startup_b_id: startupB.id,
          chosen_startup_id: startupId,
        })
        .select()
      const comparisonTime = performance.now() - comparisonStart

      if (error) {
        console.error('❌ [COMPARE] Error saving comparison:', error)
        throw error
      }

      console.log(`✅ [COMPARE] Comparison saved in ${comparisonTime.toFixed(0)}ms:`, data?.[0]?.id)
      
      // Only update comparison counts AFTER successful database insert
      // This ensures vote is only counted when actually saved, not just on click
      if (data && data.length > 0) {
        setComparisonCountA(prev => prev + 1)
        setComparisonCountB(prev => prev + 1)
      }
      
      // Calculate new Elo scores IMMEDIATELY (before DB update)
      const currentEloA = startupA.elo_rating || INITIAL_RATING
      const currentEloB = startupB.elo_rating || INITIAL_RATING
      const aWon = startupId === startupA.id
      const [newEloA, newEloB] = calculateNewElo(currentEloA, currentEloB, aWon)
      
      // Calculate deltas IMMEDIATELY so colors show right away (no blue flash)
      const deltaEloA = newEloA - currentEloA
      const deltaEloB = newEloB - currentEloB
      setDeltaA(deltaEloA)
      setDeltaB(deltaEloB)
      
      console.log('🔄 [COMPARE] Updating Elo scores:', {
        startupA: { old: currentEloA.toFixed(1), new: newEloA.toFixed(1), delta: deltaEloA.toFixed(1) },
        startupB: { old: currentEloB.toFixed(1), new: newEloB.toFixed(1), delta: deltaEloB.toFixed(1) }
      })
      
      // Update Elo scores in database (only 2 updates)
      const eloUpdateStart = performance.now()
      const [updateResultA, updateResultB] = await Promise.all([
        supabase
          .from('startups')
          .update({ elo_rating: newEloA })
          .eq('id', startupA.id)
          .select(),
        supabase
          .from('startups')
          .update({ elo_rating: newEloB })
          .eq('id', startupB.id)
          .select()
      ])
      
      // Check for errors
      if (updateResultA.error) {
        console.error('❌ [COMPARE] Error updating Elo for startupA:', updateResultA.error)
        throw updateResultA.error
      }
      if (updateResultB.error) {
        console.error('❌ [COMPARE] Error updating Elo for startupB:', updateResultB.error)
        throw updateResultB.error
      }
      
      const eloUpdateTime = performance.now() - eloUpdateStart
      const totalTime = performance.now() - startTime
      
      console.log(`✅ [COMPARE] Elo scores updated in ${eloUpdateTime.toFixed(0)}ms`)
      console.log(`   Startup A: ${updateResultA.data?.[0]?.elo_rating?.toFixed(0) || 'N/A'}`)
      console.log(`   Startup B: ${updateResultB.data?.[0]?.elo_rating?.toFixed(0) || 'N/A'}`)
      console.log(`⏱️  [COMPARE] Total update time: ${totalTime.toFixed(0)}ms`)
      
      // Start animation
      setIsAnimating(true)
      setAnimationComplete(false)
      setAnimatedEloA(currentEloA)
      setAnimatedEloB(currentEloB)
      
      // Animate both scores
      let completedAnimations = 0
      
      const checkComplete = () => {
        completedAnimations++
        console.log(`🎬 [COMPARE] Animation ${completedAnimations}/2 complete`)
        
        if (completedAnimations === 2) {
          console.log('✅ [COMPARE] Both animations complete! Waiting for user to click Next...')
          // Animation complete - update both states in a single batch to avoid double re-render
          setIsAnimating(false)
          setAnimationComplete(true)
          // Keep animatedEloA, animatedEloB, deltaA, deltaB visible (don't clear them)
        }
      }
      
      animateNumber(currentEloA, newEloA, 2000, setAnimatedEloA, checkComplete)
      animateNumber(currentEloB, newEloB, 2000, setAnimatedEloB, checkComplete)
      
    } catch (error) {
      console.error('❌ [COMPARE] Error recording comparison:', error)
      // Reset vote recorded flag on error so user can try again
      voteRecordedRef.current = false
      setSelected(null)
      setIsAnimating(false)
      setAnimationComplete(false)
      setAnimatedEloA(null)
      setAnimatedEloB(null)
      setDeltaA(null)
      setDeltaB(null)
      completionCalledRef.current = false
    } finally {
      setIsSubmitting(false)
    }
  }
  
  // Component remounts with key prop when new startups load - no need for useEffect

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">
          Which one do you believe in more?
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Trust your gut. Pick the startup you'd bet on for the next decade.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 items-stretch">
        <div
          className={`
            transition-all duration-200 ease-out h-full
            ${selected === startupA.id ? 'ring-2 rounded-xl scale-[1.02]' : ''}
            ${selected === startupA.id && deltaA === null ? 'ring-blue-500' : ''}
            ${isSubmitting || isAnimating ? 'pointer-events-none' : ''}
            ${selected === startupA.id && deltaA !== null ? (deltaA > 0 ? 'ring-green-500' : 'ring-red-500') : ''}
          `}
        >
          <StartupCard
            startup={{
              ...startupA,
              elo_rating: animatedEloA !== null ? animatedEloA : startupA.elo_rating,
              comparison_count: comparisonCountA
            }}
            onClick={selected === null ? () => handleSelect(startupA.id) : undefined}
            showPrice
            showElo
            isAnimating={isAnimating && animatedEloA !== null}
            delta={selected !== null ? deltaA : null}
            hasVoted={selected !== null && (isAnimating || animationComplete)}
          />
        </div>

        <div className="flex items-center justify-center md:hidden">
          <span className="text-gray-400 font-medium">VS</span>
        </div>

        <div
          className={`
            transition-all duration-200 ease-out h-full
            ${selected === startupB.id ? 'ring-2 rounded-xl scale-[1.02]' : ''}
            ${selected === startupB.id && deltaB === null ? 'ring-blue-500' : ''}
            ${isSubmitting || isAnimating ? 'pointer-events-none' : ''}
            ${selected === startupB.id && deltaB !== null ? (deltaB > 0 ? 'ring-green-500' : 'ring-red-500') : ''}
          `}
        >
          <StartupCard
            startup={{
              ...startupB,
              elo_rating: animatedEloB !== null ? animatedEloB : startupB.elo_rating,
              comparison_count: comparisonCountB
            }}
            onClick={selected === null ? () => handleSelect(startupB.id) : undefined}
            showPrice
            showElo
            isAnimating={isAnimating && animatedEloB !== null}
            delta={selected !== null ? deltaB : null}
            hasVoted={selected !== null && (isAnimating || animationComplete)}
          />
        </div>
      </div>
      
      <div className="mt-6 text-center">
        {selected && animationComplete ? (
          <button
            onClick={() => {
              console.log('⏭️  [COMPARE] User clicked Next, loading next comparison...')
              if (!completionCalledRef.current) {
                completionCalledRef.current = true
                // Clear state before loading next
                voteRecordedRef.current = false // Reset vote flag for next comparison
                setAnimatedEloA(null)
                setAnimatedEloB(null)
                setDeltaA(null)
                setDeltaB(null)
                setSelected(null)
                setAnimationComplete(false)
                onComparisonComplete?.()
              }
            }}
            className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-lg font-semibold hover:opacity-90 transition-all"
          >
            Next →
          </button>
        ) : !selected && !isAnimating && !animationComplete ? (
          <button
            onClick={() => onComparisonComplete?.()}
            disabled={isSubmitting}
            className="px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Skip
          </button>
        ) : null}
      </div>
    </div>
  )
}

