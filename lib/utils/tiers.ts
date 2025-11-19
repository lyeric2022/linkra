/**
 * Tier system based on Elo ratings
 * Converts numerical Elo ratings to letter grades (S, A, B, C, D, F)
 */

export type Tier = 'S' | 'A' | 'B' | 'C' | 'D' | 'F'

export interface TierInfo {
  tier: Tier
  label: string
  color: string
  bgColor: string
  description: string
}

const INITIAL_RATING = 1500

export function getTierFromRating(
  rating: number | null | undefined,
  comparisonCount?: number
): TierInfo {
  const elo = rating || INITIAL_RATING
  const comparisons = comparisonCount || 0
  
  // Adjust tier thresholds based on sample size
  // Fewer comparisons = less confidence, so require higher rating for top tiers
  let sThreshold = 1700
  let aThreshold = 1600
  let bThreshold = 1550
  
  // If less than 10 comparisons, be more conservative with tier assignments
  if (comparisons < 10) {
    sThreshold = 1750 // Require higher rating for S tier with low sample size
    aThreshold = 1650
    bThreshold = 1600
  } else if (comparisons < 25) {
    sThreshold = 1720
    aThreshold = 1620
    bThreshold = 1570
  }
  
  // Tier thresholds (based on standard deviations from initial rating)
  // S: Top 2% (1700+)
  // A: Top 10% (1600-1699)
  // B: Above average (1550-1599)
  // C: Average (1450-1549)
  // D: Below average (1400-1449)
  // F: Bottom tier (<1400)
  
  if (elo >= sThreshold) {
    return {
      tier: 'S',
      label: 'S Tier',
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
      description: comparisons < 10 ? 'Elite (Low Sample)' : 'Elite',
    }
  } else if (elo >= aThreshold) {
    return {
      tier: 'A',
      label: 'A Tier',
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
      description: comparisons < 10 ? 'Excellent (Low Sample)' : 'Excellent',
    }
  } else if (elo >= bThreshold) {
    return {
      tier: 'B',
      label: 'B Tier',
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
      description: 'Good',
    }
  } else if (elo >= 1450) {
    return {
      tier: 'C',
      label: 'C Tier',
      color: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
      description: 'Average',
    }
  } else if (elo >= 1400) {
    return {
      tier: 'D',
      label: 'D Tier',
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-100 dark:bg-orange-900/30',
      description: 'Below Average',
    }
  } else {
    return {
      tier: 'F',
      label: 'F Tier',
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-100 dark:bg-red-900/30',
      description: 'Needs Improvement',
    }
  }
}

export function getTierPercentage(rating: number | null | undefined): number {
  const elo = rating || INITIAL_RATING
  // Convert to percentage (0-100) based on tier ranges
  if (elo >= 1700) return 100
  if (elo >= 1600) return 90
  if (elo >= 1550) return 75
  if (elo >= 1450) return 50
  if (elo >= 1400) return 25
  return 10
}

