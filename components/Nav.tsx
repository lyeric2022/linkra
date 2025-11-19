'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import { useAuthContext } from '@/lib/contexts/AuthContext'

export default function Nav() {
  const pathname = usePathname()
  const { user, userProfile, signOut } = useAuthContext()
  const [showMenu, setShowMenu] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const mobileMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Close menus when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      const element = target as Element
      
      // Don't close if clicking on a link or button inside the menu (let their handlers run first)
      if (element.closest('a') || element.closest('button')) {
        // Check if the button/link is inside the menu - if so, don't close yet
        if (menuRef.current?.contains(element) || mobileMenuRef.current?.contains(element)) {
          return
        }
      }
      
      if (menuRef.current && !menuRef.current.contains(target)) {
        setShowMenu(false)
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(target)) {
        setShowMobileMenu(false)
      }
    }

    if (showMenu || showMobileMenu) {
      // Use bubbling phase (false) instead of capture phase (true) to allow button clicks to process first
      document.addEventListener('click', handleClickOutside, false)

      return () => {
        document.removeEventListener('click', handleClickOutside, false)
      }
    }
  }, [showMenu, showMobileMenu])

  const handleSignOut = async () => {
    await signOut()
    setShowMenu(false)
    setShowMobileMenu(false)
  }

  const navLinks = [
    { href: '/compare', label: 'Vote' },
    { href: '/rankings', label: 'Rankings' },
    { href: '/portfolio', label: 'Portfolio' },
    { href: '/leaderboard', label: 'Leaderboard' },
  ]

  const getUserInitials = (email: string, name?: string) => {
    if (name) {
      // Use first letter of first name and first letter of last name if available
      const parts = name.split(' ')
      if (parts.length >= 2) {
        return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
      }
      return name.substring(0, 2).toUpperCase()
    }
    if (!email) return '?'
    const parts = email.split('@')[0]
    if (parts.length >= 2) {
      return parts.substring(0, 2).toUpperCase()
    }
    return parts.charAt(0).toUpperCase()
  }

  return (
    <nav className="border-b border-gray-200 dark:border-gray-800">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="text-lg sm:text-xl font-bold">
            Linkra
          </Link>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? 'text-black dark:text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            ))}
            
            {user ? (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center text-sm font-semibold text-gray-700 dark:text-gray-300 hover:ring-2 hover:ring-gray-300 dark:hover:ring-gray-600 transition-all"
                >
                  {getUserInitials(user.email || '', userProfile?.name)}
                </button>
                
                {showMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-lg py-2 z-50">
                    <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-800">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {userProfile?.name || user.email?.split('@')[0]}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-500 truncate">
                        {user.email}
                      </div>
                    </div>
                    <Link
                      href="/settings"
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowMenu(false)
                      }}
                      className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      Settings
                    </Link>
                    <Link
                      href="/test"
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowMenu(false)
                      }}
                      className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      System Health
                    </Link>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSignOut()
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/auth"
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white"
              >
                Sign In
              </Link>
            )}
          </div>

          {/* Mobile Navigation */}
          <div className="flex md:hidden items-center gap-3">
            {user ? (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center text-xs font-semibold text-gray-700 dark:text-gray-300"
                >
                  {getUserInitials(user.email || '', userProfile?.name)}
                </button>
                
                {showMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-lg py-2 z-50">
                    <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-800">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {userProfile?.name || user.email?.split('@')[0]}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-500 truncate">
                        {user.email}
                      </div>
                    </div>
                    <Link
                      href="/settings"
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowMenu(false)
                      }}
                      className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      Settings
                    </Link>
                    <Link
                      href="/test"
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowMenu(false)
                      }}
                      className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      System Health
                    </Link>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSignOut()
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/auth"
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white"
              >
                Sign In
              </Link>
            )}
            
            <div className="relative" ref={mobileMenuRef}>
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Toggle menu"
              >
                {showMobileMenu ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
              
              {showMobileMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-lg py-2 z-50">
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowMobileMenu(false)
                      }}
                      className={`block px-4 py-2 text-sm transition-colors ${
                        pathname === link.href
                          ? 'text-black dark:text-white bg-gray-50 dark:bg-gray-800'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}

