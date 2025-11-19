'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import { ensureUserRecord } from '@/lib/utils/ensureUserRecord'

interface AuthContextType {
  user: User | null
  userProfile: any | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    console.log('🚀 [AUTH PROVIDER] useEffect started')
    let mounted = true

    // Initialize auth session - ONE session check for entire app
    const initialize = async () => {
      console.log('🔄 [AUTH PROVIDER] initialize() called')
      // Check if we're in browser environment
      if (typeof window === 'undefined') {
        console.log('⚠️ [AUTH PROVIDER] Not in browser, skipping')
        setLoading(false)
        return
      }
      
      console.log('✅ [AUTH PROVIDER] In browser, proceeding with initialization')
      
      try {
        // Try getSession() first (reads from localStorage/cookies, faster)
        // Then getUser() to validate with server
        let session = null
        let sessionError = null
        
        try {
          console.log('📡 [AUTH PROVIDER] Calling getSession()...')
          // Add timeout to getSession() too in case it hangs
          const sessionPromise = supabase.auth.getSession()
          const sessionTimeoutPromise = new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('getSession() timeout after 2s')), 2000)
          )
          
          const sessionResult = await Promise.race([sessionPromise, sessionTimeoutPromise])
          session = sessionResult.data?.session || null
          sessionError = sessionResult.error || null
          console.log('✅ [AUTH PROVIDER] getSession() completed', {
            hasSession: !!session,
            hasUser: !!session?.user,
            error: sessionError?.message,
          })
          
          // Check if session is expired
          if (session?.expires_at) {
            const expiresAt = session.expires_at * 1000 // Convert to ms
            const now = Date.now()
            const isExpired = expiresAt < now
            
            if (isExpired) {
              console.warn('⚠️ [AUTH PROVIDER] Session expired, clearing and will let listener handle it')
              // Clear the expired session
              await supabase.auth.signOut({ scope: 'local' })
              session = null
            }
          }
        } catch (sessionTimeoutError: any) {
          console.warn('⚠️ [AUTH PROVIDER] getSession() timed out:', sessionTimeoutError.message)
          sessionError = sessionTimeoutError
          
          // Try reading from localStorage directly as fallback to check for expired tokens
          try {
            const storageKey = `sb-${process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0]}-auth-token`
            const storedSession = localStorage.getItem(storageKey)
            if (storedSession) {
              const parsed = JSON.parse(storedSession)
              if (parsed?.expires_at) {
                const expiresAt = parsed.expires_at * 1000
                const isExpired = expiresAt < Date.now()
                
                if (isExpired) {
                  console.warn('⚠️ [AUTH PROVIDER] Found expired token in localStorage, clearing it')
                  // Clear expired token
                  await supabase.auth.signOut({ scope: 'local' })
                  setLoading(false)
                  return
                } else if (parsed?.access_token) {
                  // Valid token exists, let listener handle it
          setLoading(false)
          return
        }
              }
            }
          } catch (storageError) {
            // Ignore localStorage read errors
          }
        }
        
        // If we have a session, use it immediately
        if (session?.user) {
          console.log('✅ [AUTH PROVIDER] Found session via getSession()', {
            userId: session.user.id,
            email: session.user.email,
          })
          setUser(session.user)
          setLoading(false) // Set loading false early so UI can render
          console.log('✅ [AUTH PROVIDER] Set user and loading=false')
          
          // Then validate with getUser() in background
          supabase.auth.getUser()
            .then(({ data: { user: validatedUser }, error: validateError }) => {
              if (validateError) return
              if (validatedUser && mounted) {
                setUser(validatedUser)
              }
            })
            .catch(() => {
              // Ignore validation errors
            })
          
          // Continue with profile loading
          if (!mounted) return
          
          // Ensure user record exists (non-blocking)
          ensureUserRecord(session.user.id, session.user.email || '')
            .catch(err => {
              console.error('Failed to ensure user record:', err)
            })
          
          if (!mounted) return
          
          // Fetch profile (non-blocking)
          Promise.resolve(
          supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single()
          )
            .then(({ data: profile, error: profileError }) => {
              if (profileError) {
                console.error('Profile fetch error:', profileError)
                return
              }
              if (mounted && profile) {
                setUserProfile(profile)
              }
            })
            .catch((err: any) => {
              console.error('Profile fetch exception:', err)
            })
          
          return // Exit early since we handled everything
        }
        
        // If no session, try getUser() as fallback (validates with server)
        console.log('📡 [AUTH PROVIDER] No session found, trying getUser()...')
        let authUser = null
        let error = null
        
        try {
          console.log('⏱️ [AUTH PROVIDER] Calling getUser() with 5s timeout...')
          // Add timeout to prevent hanging
          const getUserPromise = supabase.auth.getUser()
          const timeoutPromise = new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('getUser() timeout after 5s')), 5000)
          )
          
          const result = await Promise.race([getUserPromise, timeoutPromise])
          authUser = result.data?.user || null
          error = result.error || null
          console.log('✅ [AUTH PROVIDER] getUser() completed', {
            hasUser: !!authUser,
            userId: authUser?.id,
            error: error?.message,
          })
        } catch (timeoutError: any) {
          console.error('❌ [AUTH PROVIDER] getUser() timed out or failed:', timeoutError.message)
          error = timeoutError
        }
        
        if (!mounted) return
        
        if (error) {
          console.error('❌ [AUTH PROVIDER] getUser() error:', error.message)
          console.log('🔄 [AUTH PROVIDER] Setting loading=false due to error')
          setLoading(false)
          return
        }
        
        if (authUser) {
          console.log('✅ [AUTH PROVIDER] Found user via getUser()', {
            userId: authUser.id,
            email: authUser.email,
          })
          setUser(authUser)
          
          // Ensure user record exists (non-blocking)
          ensureUserRecord(authUser.id, authUser.email || '')
            .catch(err => {
              console.error('Failed to ensure user record:', err)
            })
          
          if (!mounted) return
          
          // Fetch profile (non-blocking)
          Promise.resolve(
          supabase
            .from('users')
            .select('*')
              .eq('id', authUser.id)
            .single()
          )
            .then(({ data: profile, error: profileError }) => {
              if (profileError) {
                console.error('Profile fetch error:', profileError)
                return
              }
              if (mounted && profile) {
                setUserProfile(profile)
              }
            })
            .catch((err: any) => {
              console.error('Profile fetch exception:', err)
            })
        }
        
        // Always set loading to false after checking session
        console.log('🔄 [AUTH PROVIDER] Setting loading=false (end of initialize)')
        setLoading(false)
      } catch (error) {
        console.error('❌ [AUTH PROVIDER] Init exception:', error)
        if (mounted) {
          console.log('🔄 [AUTH PROVIDER] Setting loading=false due to exception')
          setLoading(false)
        }
      }
    }

    // CRITICAL: Set up auth state change listener FIRST
    // This listener fires immediately with current session and is more reliable than manual initialization
    console.log('🎧 [AUTH PROVIDER] Setting up auth state change listener...')
    let listenerInitialized = false
    let listenerFired = false
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔔 [AUTH PROVIDER] Auth state changed:', {
          event,
          hasSession: !!session,
          hasUser: !!session?.user,
          userId: session?.user?.id,
        })
        listenerFired = true
        
        if (!mounted) {
          console.log('⚠️ [AUTH PROVIDER] Component unmounted, ignoring auth state change')
          return
        }

        // Mark listener as initialized
        if (!listenerInitialized) {
          listenerInitialized = true
          console.log('✅ [AUTH PROVIDER] Auth state listener initialized')
        }
        
        // Always set loading to false when auth state changes (recovery mechanism)
        // This ensures UI doesn't hang even if initialization failed
        console.log('🔄 [AUTH PROVIDER] Setting loading=false (auth state change)')
        setLoading(false)

        if (session?.user) {
          setUser(session.user)
          
          // Ensure user record and fetch profile
          await ensureUserRecord(session.user.id, session.user.email || '')
          
          if (!mounted) return
          
          const { data: profile, error: profileError } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single()
          
          if (profileError) {
            console.error('Profile fetch error in auth state change:', profileError)
          } else if (mounted && profile) {
            setUserProfile(profile)
          }
        } else {
          setUser(null)
          setUserProfile(null)
        }
      }
    )

    // IMMEDIATE fallback: If listener doesn't fire within 500ms, set loading to false
    // This prevents UI from hanging if listener is delayed
    const immediateFallback = setTimeout(() => {
      if (mounted && !listenerFired) {
        console.log('⏰ [AUTH PROVIDER] Immediate fallback (500ms) - listener not fired, setting loading=false')
        setLoading(false)
      }
    }, 500)

    // Set a safety timeout - if initialization takes too long, set loading to false anyway
    // The auth state change listener will update the user when it fires
    const safetyTimeout = setTimeout(() => {
      if (mounted) {
        console.log('⏰ [AUTH PROVIDER] Safety timeout (2s) - setting loading=false')
        setLoading(false)
      }
    }, 2000) // 2 second safety timeout

    // Run initialization in background (non-blocking)
    // The auth state listener above will handle setting the user
    console.log('🚀 [AUTH PROVIDER] Starting initialization...')
    initialize().finally(() => {
      console.log('✅ [AUTH PROVIDER] Initialization finished')
      clearTimeout(safetyTimeout)
      clearTimeout(immediateFallback)
      if (mounted && !listenerInitialized) {
        console.warn('⚠️ [AUTH PROVIDER] Listener never initialized, setting loading=false')
        // Ensure loading is false even if listener didn't fire
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
      clearTimeout(safetyTimeout)
      clearTimeout(immediateFallback)
    }
  }, [])

  const signOut = async () => {
    console.log('🚪 [AUTH PROVIDER] Signing out...')
    try {
      // Add timeout to signOut in case it hangs
      const signOutPromise = supabase.auth.signOut()
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('signOut() timeout after 3s')), 3000)
      )
      
      try {
        await Promise.race([signOutPromise, timeoutPromise])
        console.log('✅ [AUTH PROVIDER] Sign out completed')
      } catch (timeoutError) {
        console.warn('⚠️ [AUTH PROVIDER] Sign out timed out, forcing local clear:', timeoutError)
        // Force clear locally even if server call times out
        await supabase.auth.signOut({ scope: 'local' })
      }
      
      // Always clear state
      setUser(null)
      setUserProfile(null)
      
      // Redirect to home page
      if (typeof window !== 'undefined') {
        window.location.href = '/'
      }
    } catch (err) {
      console.error('❌ [AUTH PROVIDER] Sign out exception:', err)
      // Force clear state and redirect anyway
    setUser(null)
    setUserProfile(null)
      if (typeof window !== 'undefined') {
        window.location.href = '/'
      }
    }
  }

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }
  return context
}

