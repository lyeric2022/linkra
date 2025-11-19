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
      try {
        // getUser() validates with server and reads cookies properly
        // This ensures we get the session set by server-side (middleware, OAuth callback)
        const { data: { user: authUser }, error } = await supabase.auth.getUser()
        
        if (!mounted) return
        
        if (error) {
          console.error('🔴 [AuthProvider] User error:', error)
          setLoading(false)
          return
        }
        
        if (authUser) {
          setUser(authUser)
          
          // Ensure user record exists (non-blocking)
          ensureUserRecord(authUser.id, authUser.email || '')
            .catch(err => {
              console.error('🔴 [AuthProvider] Failed to ensure user record:', err)
            })
          
          if (!mounted) return
          
          // Fetch profile (non-blocking)
          supabase
            .from('users')
            .select('*')
            .eq('id', authUser.id)
            .single()
            .then(({ data: profile }) => {
              if (mounted && profile) {
                setUserProfile(profile)
              }
            })
            .catch(err => {
              console.error('🔴 [AuthProvider] Failed to load profile:', err)
            })
        }
        
        // Always set loading to false after checking session
        setLoading(false)
      } catch (error) {
        console.error('🔴 [AuthProvider] Init error:', error)
        if (mounted) {
          setLoading(false)
        }
      }
    }

    initialize()

    // Listen for auth state changes (sign in/out, token refresh, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return

        if (session?.user) {
          setUser(session.user)
          
          // Ensure user record and fetch profile
          await ensureUserRecord(session.user.id, session.user.email || '')
          
          if (!mounted) return
          
          const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single()
          
          if (mounted && profile) {
            setUserProfile(profile)
          }
        } else {
          setUser(null)
          setUserProfile(null)
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setUserProfile(null)
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

