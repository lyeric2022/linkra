'use client'

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { useEffect } from 'react'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
    const apiHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'

    if (apiKey && typeof window !== 'undefined') {
      posthog.init(apiKey, {
        api_host: apiHost,
        person_profiles: 'identified_only', // Only create profiles for identified users
        capture_pageview: true, // Automatically capture pageviews
        capture_pageleave: true, // Track when users leave pages
        loaded: (posthog) => {
          if (process.env.NODE_ENV === 'development') {
            console.log('PostHog loaded successfully')
          }
        },
      })
    }
  }, [])

  return <PHProvider client={posthog}>{children}</PHProvider>
}
