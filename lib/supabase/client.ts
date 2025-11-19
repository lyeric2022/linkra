import { createClient } from '@supabase/supabase-js'

/**
 * Client-side Supabase client for use in Client Components
 * 
 * Using regular createClient instead of createBrowserClient from @supabase/ssr
 * because createBrowserClient has issues with hanging requests.
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
  urlFull: supabaseUrl || 'MISSING',
  keyPrefix: supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'MISSING',
  keyLength: supabaseAnonKey?.length || 0,
  isBrowser: typeof window !== 'undefined',
})

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ [SUPABASE CLIENT] Missing Supabase environment variables')
}

// Use regular createClient - more reliable than createBrowserClient
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    }
  }
)

console.log('✅ [SUPABASE CLIENT] Client created with regular createClient')
