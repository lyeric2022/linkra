'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '@/lib/supabase/client'
import { ensureUserRecord } from '@/lib/utils/ensureUserRecord'

interface AuthContextType {
  user: any | null
  userProfile: any | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any | null>(null)
  const [userProfile, setUserProfile] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch user session from Auth0 via our API
    const fetchSession = async () => {
      try {
        // Auth0 SDK provides /auth/profile endpoint by default
        const response = await fetch('/auth/profile')
        if (response.ok) {
          const auth0User = await response.json()

          console.log('🚀 [AUTH PROVIDER] Auth0 user:', auth0User)

          setUser({
            id: auth0User.sub,
            email: auth0User.email,
            user_metadata: auth0User,
          })

          // Sync with Supabase database
          await ensureUserRecord(auth0User.sub, auth0User.email || '')

          // Fetch user profile from Supabase
          const { data: profile, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', auth0User.sub)
            .single()

          if (error) {
            console.error('Profile fetch error:', error)
          } else {
            setUserProfile(profile)
          }
        } else {
          // Not authenticated
          setUser(null)
          setUserProfile(null)
        }
      } catch (err) {
        console.error('Failed to fetch session:', err)
        setUser(null)
        setUserProfile(null)
      } finally {
        setLoading(false)
      }
    }

    fetchSession()
  }, [])

  const signOut = async () => {
    console.log('🚪 [AUTH PROVIDER] Signing out...')
    // Redirect to Auth0 logout endpoint
    window.location.href = '/auth/logout'
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
