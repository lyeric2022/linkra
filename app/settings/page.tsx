'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthContext } from '@/lib/contexts/AuthContext'

export default function SettingsPage() {
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const router = useRouter()
  
  // Use auth context - middleware handles redirects for protected routes
  const { user, userProfile, loading: authLoading } = useAuthContext()

  useEffect(() => {
    // Set name from userProfile when it's loaded
    if (userProfile?.name) {
      setName(userProfile.name)
    }
  }, [userProfile])

  const handleSaveName = async () => {
    if (!user || !userProfile) return

    setSaving(true)
    setMessage(null)

    try {
      const { error } = await supabase
        .from('users')
        .update({ name: name.trim() || null })
        .eq('id', user.id)

      if (error) throw error

      // Reload user profile to get updated data
      const { data: updatedProfile } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()
      
      if (updatedProfile) {
        setName(updatedProfile.name || '')
      }
      
      setMessage({ type: 'success', text: 'Name updated successfully' })
      
      // Clear message after 3 seconds
      setTimeout(() => setMessage(null), 3000)
    } catch (error: any) {
      console.error('Error updating name:', error)
      setMessage({ type: 'error', text: error.message || 'Failed to update name' })
    } finally {
      setSaving(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  // Show loading state while auth is initializing
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-600 dark:text-gray-400">Loading settings...</div>
        </div>
      </div>
    )
  }

  if (!user || !userProfile) {
    // Auth hook handles redirect, but show message just in case
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-600 dark:text-gray-400">Please sign in to view settings.</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link 
              href="/" 
              className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors mb-4"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Home
            </Link>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              Settings
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage your account and preferences
            </p>
          </div>

          {/* Profile Section */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm mb-6 overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Profile</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Update your display name and account information
              </p>
            </div>

            <div className="p-6 space-y-6">
              {/* Display Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Display Name
                </label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent transition-all"
                  />
                  <button
                    onClick={handleSaveName}
                    disabled={saving || name.trim() === (userProfile?.name || '')}
                    className="px-6 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1.5">
                  This name will be displayed on the leaderboard
                </p>
              </div>

              {/* Email (read-only) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1.5">
                  Email is managed by Google OAuth and cannot be changed here
                </p>
              </div>

              {/* Success/Error Message */}
              {message && (
                <div className={`p-4 rounded-lg ${
                  message.type === 'success'
                    ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                    : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                }`}>
                  <p className={`text-sm font-medium ${
                    message.type === 'success'
                      ? 'text-green-800 dark:text-green-200'
                      : 'text-red-800 dark:text-red-200'
                  }`}>
                    {message.text}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Account Information */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm mb-6 overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Account Information</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Your account statistics and details
              </p>
            </div>

            <div className="p-6">
              <dl className="grid md:grid-cols-2 gap-6">
                <div>
                  <dt className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Virtual Currency</dt>
                  <dd className="text-2xl font-bold text-gray-900 dark:text-white">
                    ${userProfile.virtual_currency.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Free Gift Rolls</dt>
                  <dd className="text-2xl font-bold text-gray-900 dark:text-white">
                    {userProfile.free_gifts_count || 0}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Member Since</dt>
                  <dd className="text-lg text-gray-900 dark:text-white">
                    {new Date(userProfile.created_at).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">User ID</dt>
                  <dd className="text-sm font-mono text-gray-500 dark:text-gray-400 break-all">
                    {userProfile.id.substring(0, 8)}...
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Account Actions */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Account Actions</h2>
            </div>

            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Sign Out</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Sign out of your account. You can sign back in anytime.
                  </p>
                </div>
                <button
                  onClick={handleSignOut}
                  className="px-6 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

