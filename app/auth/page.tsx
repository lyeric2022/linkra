'use client'

import { useEffect, useState, Suspense } from 'react'
import Auth from '@/components/Auth'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthContext } from '@/lib/contexts/AuthContext'

function AuthPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading } = useAuthContext() // Use single source of truth
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Check for error in URL params
    const errorParam = searchParams.get('error')
    if (errorParam) {
      setError(errorParam)
    }

    // Middleware handles redirect, but this is a backup
    if (!loading && user) {
      const redirectTo = searchParams.get('redirect') || '/compare'
      router.push(redirectTo)
    }
  }, [router, searchParams, user, loading])

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl font-bold mb-2 text-center">Welcome to Linkra</h1>
        <p className="text-center text-gray-600 dark:text-gray-400 mb-8">
          Sign in with Google to start ranking startups
        </p>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}
        
        <Auth />
      </div>
    </div>
  )
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto text-center">
          <div className="text-gray-600 dark:text-gray-400">Loading...</div>
        </div>
      </div>
    }>
      <AuthPageContent />
    </Suspense>
  )
}

