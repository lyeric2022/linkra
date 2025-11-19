# Google OAuth Setup Guide

## Current Auth: Google OAuth Only

The app now uses **Google OAuth only** - no email/password authentication.

## Supabase Configuration

### 1. Enable Google Provider in Supabase

1. Go to your Supabase Dashboard → **Authentication → Providers**
2. Find **Google** and click to enable it
3. You'll need to create a Google OAuth app:

### 2. Create Google OAuth App

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Go to **APIs & Services → Credentials**
4. Click **Create Credentials → OAuth client ID**
5. Choose **Web application**
6. Add authorized redirect URIs:
   - Development: `https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback`
   - Production: `https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback`
   - (Supabase handles the callback, not your app directly)
7. Copy the **Client ID** and **Client Secret**

### 3. Configure Supabase Google Provider

Back in Supabase Dashboard:
1. Paste the **Client ID** and **Client Secret** from Google
2. Save the configuration

### 4. Configure Redirect URLs

In Supabase Dashboard → **Authentication → URL Configuration**:
- **Site URL**: `http://localhost:3000` (dev) or your production URL
- **Redirect URLs**: Add:
  - `http://localhost:3000/auth/callback` (dev)
  - `https://yourdomain.com/auth/callback` (production)

## How It Works

### Auth Flow

```
1. User clicks "Continue with Google" → Redirected to Google
2. User signs in with Google → Google redirects to Supabase
3. Supabase processes OAuth → Redirects to /auth/callback?code=xxx
4. Callback exchanges code for session → Redirects to /compare
5. User is now authenticated
```

### Code Structure

- **Auth Component** (`components/Auth.tsx`): Google OAuth button
- **Auth Page** (`app/auth/page.tsx`): Landing page with Google sign-in
- **Callback Handler** (`app/auth/callback/route.ts`): Processes OAuth callback
- **Database Trigger**: Auto-creates user record when Google user signs in

### User Record Creation

When a user signs in with Google for the first time:
1. Supabase creates an `auth.users` record
2. Database trigger `on_auth_user_created` fires
3. Creates `public.users` record with:
   - Same UUID as auth user
   - Email from Google account
   - Default virtual currency (10,000)

## Testing

1. Start dev server: `bun run dev`
2. Visit `http://localhost:3000/auth`
3. Click "Continue with Google"
4. Sign in with Google account
5. Should redirect back to app and be logged in

## Troubleshooting

**"OAuth provider not enabled" error:**
- Make sure Google provider is enabled in Supabase Dashboard
- Verify Client ID and Secret are correct

**"Redirect URI mismatch" error:**
- Check Google Cloud Console authorized redirect URIs
- Must match: `https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback`

**"Invalid callback URL" error:**
- Verify redirect URLs in Supabase Dashboard
- Add `http://localhost:3000/auth/callback` to allowed URLs

**User record not created:**
- Check Supabase logs for trigger errors
- Verify `handle_new_user()` function exists in database
- Check that trigger is active

## Environment Variables

No additional env vars needed beyond:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

The OAuth credentials are stored in Supabase, not in your app.

