import { usePostHog } from 'posthog-js/react'
import { useAuthContext } from '@/lib/contexts/AuthContext'
import { useEffect } from 'react'

/**
 * Custom hook that provides PostHog tracking with automatic user identification
 */
export function useAnalytics() {
  const posthog = usePostHog()
  const { user, userProfile } = useAuthContext()

  // Identify user when they log in
  useEffect(() => {
    if (user && userProfile) {
      posthog.identify(user.id, {
        email: user.email,
        name: userProfile.name,
        virtual_currency: userProfile.virtual_currency,
        free_gifts_count: userProfile.free_gifts_count,
      })
    }
  }, [user, userProfile, posthog])

  return {
    // Track custom events
    track: (eventName: string, properties?: Record<string, any>) => {
      posthog.capture(eventName, properties)
    },

    // Track page views (if you need manual control)
    trackPageView: (pageName?: string) => {
      posthog.capture('$pageview', pageName ? { page_name: pageName } : undefined)
    },

    // Set user properties (to update existing user)
    setUserProperties: (properties: Record<string, any>) => {
      if (user) {
        posthog.setPersonProperties(properties)
      }
    },

    // Track feature flags
    isFeatureEnabled: (flagKey: string) => {
      return posthog.isFeatureEnabled(flagKey)
    },

    // Reset on logout
    reset: () => {
      posthog.reset()
    },
  }
}

// Event names - centralized for consistency
export const EVENTS = {
  // Authentication
  USER_SIGNED_UP: 'user_signed_up',
  USER_LOGGED_IN: 'user_logged_in',
  USER_LOGGED_OUT: 'user_logged_out',

  // Comparisons
  COMPARISON_MADE: 'comparison_made',
  COMPARISON_SKIPPED: 'comparison_skipped',

  // Trading
  TRADE_BUY: 'trade_buy',
  TRADE_SELL: 'trade_sell',
  TRADE_SHORT: 'trade_short',
  TRADE_COVER: 'trade_cover',

  // Free Roll
  ROLL_SUCCESS: 'roll_success',
  ROLL_FAILED: 'roll_failed',
  ROLL_COOLDOWN_HIT: 'roll_cooldown_hit',

  // Navigation
  PAGE_VIEW_RANKINGS: 'page_view_rankings',
  PAGE_VIEW_PORTFOLIO: 'page_view_portfolio',
  PAGE_VIEW_COMPARE: 'page_view_compare',
  PAGE_VIEW_STARTUP_DETAIL: 'page_view_startup_detail',

  // Startup Submission
  STARTUP_SUBMITTED: 'startup_submitted',

  // Other
  SEARCH_PERFORMED: 'search_performed',
} as const
