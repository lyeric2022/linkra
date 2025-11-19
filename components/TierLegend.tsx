'use client'

import { getTierFromRating } from '@/lib/utils/tiers'

export default function TierLegend() {
  const tiers = [
    getTierFromRating(1700), // S
    getTierFromRating(1600), // A
    getTierFromRating(1550), // B
    getTierFromRating(1500), // C
    getTierFromRating(1400), // D
    getTierFromRating(1300), // F
  ]

  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <span className="text-gray-600 dark:text-gray-400 font-medium">Tiers:</span>
      {tiers.map((tier) => (
        <div
          key={tier.tier}
          className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full font-medium ${tier.bgColor} ${tier.color}`}
        >
          <span className="font-bold">{tier.tier}</span>
          <span>{tier.description}</span>
        </div>
      ))}
    </div>
  )
}

