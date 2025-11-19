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
    let mounted = true

    // Initialize auth session - ONE session check for entire app
    const initialize = async () => {
      // Check if we're in browser environment
      if (typeof window === 'undefined') {
        setLoading(false)
        return
      }
      
      try {
        // Try getSession() first (reads from localStorage/cookies, faster)
        // Then getUser() to validate with server
        let session = null
        let sessionError = null
        
        try {
          // Add timeout to getSession() too in case it hangs
          const sessionPromise = supabase.auth.getSession()
          const sessionTimeoutPromise = new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('getSession() timeout after 2s')), 2000)
          )
          
          const sessionResult = await Promise.race([sessionPromise, sessionTimeoutPromise])
          session = sessionResult.data?.session || null
          sessionError = sessionResult.error || null
        } catch (sessionTimeoutError: any) {
          sessionError = sessionTimeoutError
          
          // Try reading from localStorage directly as fallback
          try {
            const storageKey = `sb-${process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0]}-auth-token`
            const storedSession = localStorage.getItem(storageKey)
            if (storedSession) {
              const parsed = JSON.parse(storedSession)
              if (parsed?.access_token) {
                // Don't set user here - let auth state change listener handle it
                // Just set loading to false so UI can render
                setLoading(false)
                return
              }
            }
          } catch (storageError) {
            // Ignore localStorage read errors
          }
        }
        
        // If we have a session, use it immediately
        if (session?.user) {
          setUser(session.user)
          setLoading(false) // Set loading false early so UI can render
          
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
        let authUser = null
        let error = null
        
        try {
          // Add timeout to prevent hanging
          const getUserPromise = supabase.auth.getUser()
          const timeoutPromise = new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('getUser() timeout after 5s')), 5000)
          )
          
          const result = await Promise.race([getUserPromise, timeoutPromise])
          authUser = result.data?.user || null
          error = result.error || null
        } catch (timeoutError: any) {
          console.error('getUser() timed out or failed:', timeoutError)
          error = timeoutError
        }
        
        if (!mounted) return
        
        if (error) {
          console.error('getUser() error:', error)
          setLoading(false)
          return
        }
        
        if (authUser) {
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
        setLoading(false)
      } catch (error) {
        console.error('Init exception:', error)
        if (mounted) {
          setLoading(false)
        }
      }
    }

    // CRITICAL: Set up auth state change listener FIRST
    // This listener fires immediately with current session and is more reliable than manual initialization
    let listenerInitialized = false
    let listenerFired = false
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        listenerFired = true
        
        if (!mounted) return

        // Mark listener as initialized
        if (!listenerInitialized) {
          listenerInitialized = true
        }
        
        // Always set loading to false when auth state changes (recovery mechanism)
        // This ensures UI doesn't hang even if initialization failed
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
        setLoading(false)
      }
    }, 500)

    // Set a safety timeout - if initialization takes too long, set loading to false anyway
    // The auth state change listener will update the user when it fires
    const safetyTimeout = setTimeout(() => {
      if (mounted) {
        setLoading(false)
      }
    }, 2000) // 2 second safety timeout

    // Run initialization in background (non-blocking)
    // The auth state listener above will handle setting the user
    initialize().finally(() => {
      clearTimeout(safetyTimeout)
      clearTimeout(immediateFallback)
      if (mounted && !listenerInitialized) {
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
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Sign out error:', error)
      }
      setUser(null)
      setUserProfile(null)
    } catch (err) {
      console.error('Sign out exception:', err)
      setUser(null)
      setUserProfile(null)
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

