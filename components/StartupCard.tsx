'use client'

import { Startup } from '@/lib/types/database'

interface StartupCardProps {
  startup: Startup & { comparison_count?: number }
  onClick?: () => void
  showRank?: boolean
  showPrice?: boolean
  showElo?: boolean
  showComparisonCount?: boolean
  isAnimating?: boolean
  delta?: number | null
  hasVoted?: boolean // New prop to control visibility of Elo, price, and vote count
}

export default function StartupCard({ 
  startup, 
  onClick,
  showRank = false,
  showPrice = false,
  showElo = true,
  showComparisonCount = true,
  isAnimating = false,
  delta = null,
  hasVoted = false,
}: StartupCardProps) {
  return (
    <div
      onClick={onClick}
      className={`
        group relative bg-white dark:bg-gray-900 
        border border-gray-200 dark:border-gray-800 
        rounded-xl p-6
        cursor-pointer transition-all duration-200
        hover:shadow-md hover:shadow-gray-200/50 dark:hover:shadow-gray-900/50
        hover:border-gray-300 dark:hover:border-gray-700
        ${onClick ? '' : 'cursor-default'}
        h-full flex flex-col min-w-0
      `}
    >
      {/* Elo Badge - Top Right (only show after vote) */}
      {showElo && hasVoted && startup.elo_rating !== null && startup.elo_rating !== undefined && (
        <div className="absolute top-5 right-5">
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all duration-200 ${
            delta !== null && delta !== undefined
              ? delta > 0
                ? 'bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 border-green-300 dark:border-green-700 shadow-sm'
                : 'bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 border-red-300 dark:border-red-700 shadow-sm'
              : 'bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700/50 border-gray-200/50 dark:border-gray-700/50'
          }`}>
            <span className={`text-xs font-semibold uppercase tracking-wider ${
              delta !== null && delta !== undefined
                ? delta > 0 
                  ? 'text-green-700 dark:text-green-300' 
                  : 'text-red-700 dark:text-red-300'
                : 'text-gray-500 dark:text-gray-400'
            }`}>
              Elo
            </span>
            <span className={`text-base font-bold transition-colors ${
              delta !== null && delta !== undefined
                ? delta > 0 
                  ? 'text-green-900 dark:text-green-100' 
                  : 'text-red-900 dark:text-red-100'
                : 'text-gray-900 dark:text-gray-100'
            }`}>
              {startup.elo_rating.toFixed(0)}
            </span>
            {delta !== null && delta !== undefined && (
              <span className={`text-xs font-bold ${
                delta > 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
              }`}>
                {delta > 0 ? '+' : ''}{delta.toFixed(0)}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-4">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 leading-tight group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors">
          {startup.name}
        </h3>
      </div>

      {/* Description */}
      {startup.description && (
        <div className="flex-grow min-w-0 mb-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-4 leading-relaxed break-words">
            {startup.description}
          </p>
        </div>
      )}
      
      {/* Metadata Tags */}
      <div className="flex flex-wrap items-center gap-2 mb-4 flex-shrink-0">
        {startup.sector && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/50">
            {startup.sector}
          </span>
        )}
        {startup.batch && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border border-purple-200/50 dark:border-purple-800/50">
            {startup.batch}
          </span>
        )}
        {startup.location && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 border border-gray-200/50 dark:border-gray-700/50">
            {startup.location}
          </span>
        )}
      </div>

      {/* Footer (only show after vote) */}
      {hasVoted && (
        <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800 mt-auto flex-shrink-0">
          {showComparisonCount && startup.comparison_count !== undefined && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{startup.comparison_count} {startup.comparison_count === 1 ? 'vote' : 'votes'}</span>
            </div>
          )}
          {showPrice && startup.website && (
            <a
              href={startup.website.startsWith('http') ? startup.website : `https://${startup.website}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                const url = startup.website?.startsWith('http') ? startup.website : `https://${startup.website}`
                window.open(url, '_blank', 'noopener,noreferrer')
              }}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              <span className="truncate max-w-[120px]">Website</span>
            </a>
          )}
        </div>
      )}
    </div>
  )
}

