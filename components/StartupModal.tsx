'use client'

import { Startup } from '@/lib/types/database'
import { useEffect } from 'react'

interface StartupModalProps {
  startup: Startup & { comparison_count?: number }
  isOpen: boolean
  onClose: () => void
}

export default function StartupModal({ startup, isOpen, onClose }: StartupModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {startup.name}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Description */}
          {startup.description && (
            <div>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
                About
              </h3>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                {startup.description}
              </p>
            </div>
          )}

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4">
            {startup.sector && (
              <div>
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">
                  Sector
                </h3>
                <p className="text-gray-900 dark:text-white font-medium">{startup.sector}</p>
              </div>
            )}
            {startup.batch && (
              <div>
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">
                  Batch
                </h3>
                <p className="text-gray-900 dark:text-white font-medium">{startup.batch}</p>
              </div>
            )}
            {startup.location && (
              <div>
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">
                  Location
                </h3>
                <p className="text-gray-900 dark:text-white font-medium">{startup.location}</p>
              </div>
            )}
            {startup.elo_rating !== null && startup.elo_rating !== undefined && (
              <div>
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">
                  Elo Rating
                </h3>
                <p className="text-gray-900 dark:text-white font-medium">
                  {startup.elo_rating.toFixed(0)}
                </p>
              </div>
            )}
            {startup.comparison_count !== undefined && (
              <div>
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">
                  Votes
                </h3>
                <p className="text-gray-900 dark:text-white font-medium">
                  {startup.comparison_count} {startup.comparison_count === 1 ? 'vote' : 'votes'}
                </p>
              </div>
            )}
            {startup.market_price !== null && startup.market_price !== undefined && (
              <div>
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">
                  Price
                </h3>
                <p className="text-gray-900 dark:text-white font-medium">
                  ${startup.market_price.toFixed(2)}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

