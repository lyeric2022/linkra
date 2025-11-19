'use client'

import { usePathname } from 'next/navigation'
import { useAuthContext } from '@/lib/contexts/AuthContext'

/**
 * Single auth wrapper component that wraps the entire app
 * - Handles loading state globally
 * - Middleware handles route protection, so we just show loading here
 * - Pages don't need to check auth - they can assume user exists if on protected route
 */
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { loading, user } = useAuthContext()
  const pathname = usePathname()
  
  // Public routes that don't need auth
  const publicRoutes = ['/auth', '/rankings', '/leaderboard', '/']
  const isPublicRoute = publicRoutes.includes(pathname) || pathname.startsWith('/startup/')

  // Show loading only on protected routes while auth initializes
  // Public routes can render immediately
  if (loading && !isPublicRoute) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white mb-4"></div>
          <div className="text-gray-600 dark:text-gray-400">Loading...</div>
        </div>
      </div>
    )
  }

  // Render children - middleware handles route protection
  return <>{children}</>
}

