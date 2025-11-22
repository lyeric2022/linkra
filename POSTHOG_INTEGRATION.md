# PostHog Integration Guide

This document explains how PostHog analytics is integrated into Linkra and how to use it.

## Setup

### 1. Get PostHog Credentials

1. Sign up for PostHog at https://app.posthog.com
2. Create a new project or select an existing one
3. Go to Project Settings → Project API Key
4. Copy your API key

### 2. Configure Environment Variables

Add these to your `.env.local` file:

```bash
NEXT_PUBLIC_POSTHOG_KEY=phc_your_key_here
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com  # or https://eu.i.posthog.com for EU
```

### 3. PostHog is Now Active!

The integration will automatically:
- Track pageviews
- Identify logged-in users
- Track custom events throughout the app

## Architecture

### Client-Side Tracking

**Location:** `lib/contexts/PostHogProvider.tsx`

The PostHogProvider wraps the entire app and initializes PostHog with:
- Automatic pageview tracking
- Page leave tracking
- Person profiles for identified users only

### Custom Hook

**Location:** `lib/utils/posthog.ts`

Use the `useAnalytics()` hook in any component for easy event tracking:

```typescript
import { useAnalytics, EVENTS } from '@/lib/utils/posthog'

function MyComponent() {
  const { track, setUserProperties } = useAnalytics()

  const handleAction = () => {
    track(EVENTS.COMPARISON_MADE, {
      startup_a: 'Startup Name A',
      startup_b: 'Startup Name B',
      winner: 'Startup Name A'
    })
  }
}
```

### Server-Side Tracking

**Location:** API routes (e.g., `app/api/roll/route.ts`)

For server-side events like API calls, we use `posthog-node`:

```typescript
import { PostHog } from 'posthog-node'

const posthog = new PostHog(
  process.env.NEXT_PUBLIC_POSTHOG_KEY!,
  { host: process.env.NEXT_PUBLIC_POSTHOG_HOST }
)

posthog.capture({
  distinctId: userId,
  event: 'roll_success',
  properties: {
    startup_name: 'Example Startup',
    shares_granted: 10,
  },
})

await posthog.shutdown() // Important: flush events before response
```

## Events Currently Tracked

### Roll Feature
- **`roll_success`** (server-side)
  - Properties: `startup_id`, `startup_name`, `shares_granted`, `remaining_gifts`, `was_new_holding`
  - Tracked when user successfully rolls and receives shares

- **`roll_completed_client`** (client-side)
  - Properties: `startup_name`, `shares`, `remaining_gifts`
  - Client-side confirmation of successful roll

- **`roll_failed`** (client-side)
  - Properties: `error`, `remaining_gifts`
  - Tracked when roll API call fails

### Available Event Constants

See `lib/utils/posthog.ts` for all available event names:

```typescript
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
}
```

## How to Add Tracking to New Features

### Client-Side Component

```typescript
'use client'

import { useAnalytics, EVENTS } from '@/lib/utils/posthog'

export function MyFeature() {
  const { track } = useAnalytics()

  const handleUserAction = async () => {
    // Do something

    // Track it
    track(EVENTS.COMPARISON_MADE, {
      custom_property: 'value',
      another_property: 123,
    })
  }

  return <button onClick={handleUserAction}>Click me</button>
}
```

### Server-Side API Route

```typescript
import { PostHog } from 'posthog-node'

function getPostHogClient() {
  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
  const apiHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'

  if (!apiKey) return null
  return new PostHog(apiKey, { host: apiHost })
}

export async function POST(request: Request) {
  const { userId, data } = await request.json()

  // Your business logic here

  // Track the event
  const posthog = getPostHogClient()
  if (posthog) {
    posthog.capture({
      distinctId: userId,
      event: 'custom_event_name',
      properties: {
        property1: 'value',
        property2: 123,
      },
    })
    await posthog.shutdown() // Flush before returning
  }

  return Response.json({ success: true })
}
```

## User Identification

Users are automatically identified when they log in. The `useAnalytics` hook calls `posthog.identify()` with:

- `distinct_id`: User's Supabase UUID
- Properties:
  - `email`
  - `name`
  - `virtual_currency`
  - `free_gifts_count`

You can add more user properties anytime:

```typescript
const { setUserProperties } = useAnalytics()

setUserProperties({
  subscription_tier: 'premium',
  total_trades: 150,
})
```

## Feature Flags (Optional)

PostHog supports feature flags for A/B testing:

```typescript
const { isFeatureEnabled } = useAnalytics()

if (isFeatureEnabled('new-ui-design')) {
  // Show new UI
} else {
  // Show old UI
}
```

## Privacy & Performance

- PostHog is configured with `person_profiles: 'identified_only'` - anonymous users don't create person profiles
- All tracking is opt-in via environment variables - if `NEXT_PUBLIC_POSTHOG_KEY` is not set, no tracking occurs
- Events are batched and sent asynchronously to minimize performance impact
- Server-side tracking uses `await posthog.shutdown()` to ensure events are flushed before responses are sent

## Debugging

In development mode, PostHog logs to the console when initialized:

```
PostHog loaded successfully
```

You can also check the Network tab in browser DevTools for requests to PostHog (look for requests to your `NEXT_PUBLIC_POSTHOG_HOST`).

## PostHog Dashboard

View your analytics at: https://app.posthog.com

Key features:
- **Insights**: Create custom charts and funnels
- **Dashboards**: Build custom dashboards with multiple insights
- **Recordings**: Watch session replays (if enabled)
- **Feature Flags**: Manage A/B tests and feature rollouts
- **Cohorts**: Create user segments based on properties and events
