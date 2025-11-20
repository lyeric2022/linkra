import { NextResponse, type NextRequest } from 'next/server'
import { auth0 } from '@/lib/auth0'

/**
 * Proxy for Next.js App Router
 * - Handles Auth0 authentication routes
 * - Protects routes that require authentication
 * - Handles auth redirects
 */
export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Let Auth0 middleware handle its own routes (/auth/login, /auth/callback, /auth/logout, /auth/me)
  if (pathname.startsWith('/auth/')) {
    return auth0.middleware(request)
  }

  // For other routes, check authentication status
  let user = null
  let response = NextResponse.next()

  try {
    const session = await auth0.getSession(request)
    user = session?.user || null
  } catch (error) {
    // User not authenticated
    user = null
  }

  // Protected routes - redirect to /auth if not authenticated
  const protectedRoutes = ['/compare', '/portfolio', '/submit', '/settings']
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  )

  if (isProtectedRoute && !user) {
    const redirectUrl = new URL('/auth', request.url)
    redirectUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Redirect authenticated users away from auth page
  if (pathname === '/auth' && user) {
    const redirectTo = request.nextUrl.searchParams.get('redirect') || '/compare'
    return NextResponse.redirect(new URL(redirectTo, request.url))
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

