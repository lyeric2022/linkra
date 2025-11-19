# Authentication Setup Guide

## Current Auth Implementation

**Yes, we're using Supabase Auth** - specifically email/password authentication.

### What's Implemented

1. **Sign Up/Sign In Flow** (`/auth` page)
   - Email + password authentication
   - Toggle between sign up and sign in
   - Email confirmation required for new signups

2. **Auth State Management**
   - `Nav` component listens to auth state changes
   - Protected routes check auth status
   - Auto-redirect if not authenticated

3. **Database Integration**
   - User records auto-created via database trigger when auth user signs up
   - Users table linked to `auth.users` via foreign key
   - Row Level Security (RLS) policies enforce user data access

4. **Auth Callback Handler** (`/auth/callback`)
   - Handles email confirmation links
   - Exchanges confirmation code for session
   - Redirects to app after successful confirmation

### Auth Flow

```
1. User visits /auth
2. Enters email + password
3. Signs up → Supabase sends confirmation email
4. Clicks email link → Redirects to /auth/callback?code=xxx
5. Callback exchanges code for session
6. User redirected to /compare (or wherever they came from)
```

### Supabase Configuration Needed

In your Supabase dashboard:

1. **Authentication → URL Configuration**
   - Site URL: `http://localhost:3000` (dev) or your production URL
   - Redirect URLs: Add `http://localhost:3000/auth/callback`

2. **Authentication → Email Templates**
   - Customize confirmation email if desired
   - Default template works fine

3. **Authentication → Providers**
   - Email provider is enabled by default
   - Can add OAuth providers (Google, GitHub, etc.) later

### Environment Variables Required

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Current Auth Features

✅ Email/password sign up  
✅ Email/password sign in  
✅ Email confirmation  
✅ Sign out  
✅ Protected routes  
✅ Auth state persistence  
✅ Auto user record creation  

### Missing (Can Add Later)

❌ OAuth providers (Google, GitHub, etc.)  
❌ Password reset flow  
❌ Magic link (passwordless) login  
❌ Social login buttons  
❌ Remember me / persistent sessions  

### How It Works

**Client-side (`components/Auth.tsx`):**
- Uses `supabase.auth.signUp()` for registration
- Uses `supabase.auth.signInWithPassword()` for login
- Handles errors and loading states

**Server-side (`app/auth/callback/route.ts`):**
- Receives confirmation code from email link
- Exchanges code for session using `supabase.auth.exchangeCodeForSession()`
- Redirects user to app

**Database (`supabase/schema.sql`):**
- Trigger `on_auth_user_created` auto-creates user record
- Links `public.users` to `auth.users` via UUID foreign key
- Sets default virtual currency (10,000)

### Testing Auth

1. Start dev server: `bun run dev`
2. Visit `http://localhost:3000/auth`
3. Sign up with email + password
4. Check email for confirmation link
5. Click link → should redirect to app
6. Should see "Sign Out" button in nav

### Troubleshooting

**"Email not confirmed" error:**
- Check spam folder for confirmation email
- Verify redirect URL is configured in Supabase dashboard

**"Invalid credentials" error:**
- Make sure you confirmed your email first
- Check if email/password are correct

**User record not created:**
- Check Supabase logs for trigger errors
- Verify `handle_new_user()` function exists in database

