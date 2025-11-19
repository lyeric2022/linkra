import { createBrowserClient } from '@supabase/ssr'

/**
 * Client-side Supabase client for use in Client Components
 * 
 * Note: This client uses localStorage by default, but getUser() makes HTTP requests
 * that automatically include cookies set by server-side (middleware, OAuth callback).
 * This ensures session synchronization between server and client.
 * 
 * Usage in Client Components:
 * ```ts
 * import { supabase } from '@/lib/supabase/client'
 * ```
 */
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
