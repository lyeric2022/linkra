'use client'

import { getTierFromRating } from '@/lib/utils/tiers'

interface TierBadgeProps {
  eloRating: number | null | undefined
  comparisonCount?: number
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

export default function TierBadge({ 
  eloRating, 
  comparisonCount,
  size = 'md', 
  showLabel = true 
}: TierBadgeProps) {
  const tierInfo = getTierFromRating(eloRating, comparisonCount)
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5',
  }

  return (
    <div
      className={`
        inline-flex items-center gap-1.5 rounded-full font-bold
        ${tierInfo.bgColor} ${tierInfo.color}
        ${sizeClasses[size]}
      `}
      title={`${tierInfo.label} - ${tierInfo.description} (Rating: ${eloRating?.toFixed(0) || 'N/A'})`}
    >
      <span>{tierInfo.tier}</span>
      {showLabel && <span className="font-medium">{tierInfo.label}</span>}
    </div>
  )
}

