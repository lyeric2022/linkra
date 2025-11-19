/**
 * Utility to ensure user record exists in public.users table
 * Auto-creates it if missing (useful if trigger didn't fire)
 */

import { supabase } from '@/lib/supabase/client'

export async function ensureUserRecord(userId: string, email: string): Promise<boolean> {
  try {
    // Check if user record exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single()

    // If record exists, we're good
    if (existingUser && !checkError) {
      return true
    }

    // Record doesn't exist, create it
    console.log(`🔧 [USER] Creating missing user record for ${email}`)
    
    // Derive name from email (fallback - trigger should handle this better)
    const emailUsername = email.split('@')[0]
    const derivedName = emailUsername.includes('.')
      ? emailUsername.split('.').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
      : emailUsername.charAt(0).toUpperCase() + emailUsername.slice(1)
    
    const { error: insertError } = await supabase
      .from('users')
      .insert({
        id: userId,
        email: email,
        name: derivedName,
        virtual_currency: 10000.00,
        free_gifts_count: 5,
      })

    if (insertError) {
      // If it's a conflict error, record was created between check and insert (race condition)
      if (insertError.code === '23505') {
        console.log(`✅ [USER] User record already exists (race condition)`)
        return true
      }
      
      console.error('❌ [USER] Error creating user record:', insertError)
      return false
    }

    console.log(`✅ [USER] Created user record for ${email}`)
    return true
  } catch (error: any) {
    console.error('❌ [USER] Unexpected error ensuring user record:', error)
    return false
  }
}

