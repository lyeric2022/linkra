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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('🔧 [SUPABASE CLIENT] Initializing...', {
  hasUrl: !!supabaseUrl,
  hasKey: !!supabaseAnonKey,
  url: supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'MISSING',
  keyPrefix: supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'MISSING',
  isBrowser: typeof window !== 'undefined',
})

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ [SUPABASE CLIENT] Missing Supabase environment variables:', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey,
    url: supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'MISSING',
  })
  console.error('💡 [SUPABASE CLIENT] Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in Vercel')
  console.error('💡 [SUPABASE CLIENT] Go to: Vercel Dashboard → Your Project → Settings → Environment Variables')
}

// Create client - if env vars are missing, it will fail with clear errors
export const supabase = createBrowserClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
)

console.log('✅ [SUPABASE CLIENT] Client created', {
  url: supabaseUrl ? 'SET' : 'MISSING',
  key: supabaseAnonKey ? 'SET' : 'MISSING',
})
