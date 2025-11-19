# Authentication Architecture

## Overview

This app uses **Supabase Auth** with **Next.js App Router** following Supabase's official best practices.

## Key Principles

### 1. **Separate Clients for Server vs Client**

- **Client Components**: Use `@/lib/supabase/client` (browser client, localStorage)
- **Server Components/API Routes**: Use `@/lib/supabase/server` (server client, cookies)
- **Middleware**: Uses `createServerClient` from `@supabase/ssr`

### 2. **Middleware Handles Session Refresh**

The `middleware.ts` file:
- ✅ Automatically refreshes expired sessions (critical for SSR)
- ✅ Protects routes (`/compare`, `/portfolio`, `/submit`)
- ✅ Redirects unauthenticated users to `/auth`
- ✅ Redirects authenticated users away from `/auth`

### 3. **Single Source of Truth**

- **AuthProvider** (`lib/contexts/AuthContext.tsx`) wraps the entire app
- All Client Components use `useAuthContext()` hook
- No direct `getSession()` or `getUser()` calls in components

## File Structure

```
lib/supabase/
├── client.ts      # Browser client (Client Components)
└── server.ts      # Server client (Server Components, API Routes)

middleware.ts      # Route protection & session refresh
lib/contexts/
└── AuthContext.tsx  # Global auth state (Client Components)
```

## Usage Examples

### Client Component
```tsx
'use client'
import { useAuthContext } from '@/lib/contexts/AuthContext'
import { supabase } from '@/lib/supabase/client'

export default function MyComponent() {
  const { user, userProfile, loading } = useAuthContext()
  
  // For database queries in client components
  const { data } = await supabase.from('table').select('*')
}
```

### Server Component / API Route
```tsx
import { createClient } from '@/lib/supabase/server'

export default async function ServerComponent() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  // User is available server-side!
}
```

### Protected Route
```tsx
// Middleware automatically protects these routes:
// - /compare
// - /portfolio  
// - /submit

// No code needed - middleware handles redirects!
```

## Why This Architecture?

### ✅ **Security**
- Cookies for server-side (HttpOnly, Secure)
- Middleware validates sessions before page loads
- No tokens exposed in client-side code

### ✅ **Performance**
- Single session check in middleware
- No duplicate `getSession()` calls
- Automatic token refresh

### ✅ **Developer Experience**
- Simple `useAuthContext()` hook
- Type-safe with TypeScript
- Follows Supabase's official patterns

## Migration Notes

**Before (Wrong)**:
```tsx
// ❌ Direct getUser() calls everywhere
const { data: { user } } = await supabase.auth.getUser()
```

**After (Correct)**:
```tsx
// ✅ Use AuthContext in Client Components
const { user } = useAuthContext()

// ✅ Use server client in Server Components
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
```

## Key Differences from Old Implementation

1. **@supabase/ssr** package instead of `@supabase/supabase-js` directly
2. **Middleware** handles session refresh (not just route protection)
3. **Cookie-based** sessions for server-side (more secure)
4. **Single AuthProvider** - no duplicate session checks

