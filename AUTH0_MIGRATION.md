# Auth0 Migration Guide

This guide explains how to complete the Auth0 migration for Linkra.

## What Changed

### Authentication Provider
- **Before**: Supabase Auth (Google OAuth)
- **After**: Auth0 (supports multiple providers including Google)

### Database
- **Remains**: Supabase (for users, startups, portfolios, votes, etc.)

## Setup Instructions

### 1. Create an Auth0 Account and Application

1. Go to [Auth0 Dashboard](https://manage.auth0.com/dashboard/)
2. Sign up or log in
3. Create a new **Regular Web Application**
4. Note down your:
   - Domain (e.g., `your-tenant.us.auth0.com`)
   - Client ID
   - Client Secret

### 2. Configure Auth0 Application Settings

In your Auth0 application settings, configure:

**Application URIs Tab:**
- **Application Login URI**: Leave this EMPTY (don't set it - this is what's causing the HTTPS error)
- **Initiate Login URI**: Leave this EMPTY

**Allowed Callback URLs:**
```
http://localhost:3000/auth/callback
https://your-production-domain.com/auth/callback
```

**Allowed Logout URLs:**
```
http://localhost:3000
https://your-production-domain.com
```

**Allowed Web Origins:**
```
http://localhost:3000
https://your-production-domain.com
```

**IMPORTANT**: Do NOT set the "Initiate Login URI" field - leave it empty. This field requires HTTPS and is not needed for our setup.

### 3. Enable Google Social Connection

1. In Auth0 Dashboard, go to **Authentication → Social**
2. Click on **Google**
3. Enable the connection
4. Enter your Google OAuth credentials (or use Auth0's dev keys for testing)
5. Make sure your application is enabled for this connection

### 4. Set Up Environment Variables

Create a `.env.local` file (or update your existing one) with the following:

```bash
# Auth0 Configuration
AUTH0_SECRET='<generate-with: openssl rand -hex 32>'
APP_BASE_URL='http://localhost:3000'
AUTH0_ISSUER_BASE_URL='https://your-tenant.us.auth0.com'
AUTH0_CLIENT_ID='your-client-id'
AUTH0_CLIENT_SECRET='your-client-secret'

# Supabase Configuration (Database Only)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Generate the AUTH0_SECRET:**
```bash
openssl rand -hex 32
```

### 5. Update Supabase Database Schema

Since we're now using Auth0 user IDs instead of Supabase Auth IDs, you need to handle user IDs from Auth0.

Auth0 user IDs look like: `google-oauth2|123456789` or `auth0|abc123`

Your existing `users` table should work fine, but ensure:
- The `id` column can store Auth0's format (typically `auth0|...` or `google-oauth2|...`)
- You may want to run a migration to update existing user IDs if you have data

**Optional: If you need to migrate existing users:**
```sql
-- This is just an example - customize based on your needs
-- You'll need to map old Supabase user IDs to new Auth0 user IDs
```

### 6. Start the Development Server

```bash
bun run dev
```

## How Authentication Works Now

### Auth0 v4 Architecture
Auth0 v4 uses a **middleware-based approach** instead of API routes. The Auth0 SDK is integrated into the proxy/middleware layer and automatically handles authentication routes.

### Login Flow
1. User clicks "Continue with Google" on `/auth` page
2. User is redirected to `/auth/login` (handled by Auth0 middleware in proxy.ts)
3. Auth0 middleware initiates OAuth flow with Google
4. User completes authentication with Google
5. Google redirects back to `/auth/callback` (handled by Auth0 middleware)
6. Auth0 middleware creates a session cookie
7. User is redirected to the protected route (e.g., `/compare`)
8. AuthContext fetches user data from `/auth/me` endpoint
9. AuthContext syncs the Auth0 user with Supabase database

### User Data Flow
1. **Auth0**: Handles authentication, provides user info (email, name, picture)
2. **AuthContext**: Receives Auth0 user via `useUser()` hook
3. **Supabase**: Stores user profile data (currency, gifts, created_at, etc.)
4. **Sync**: `ensureUserRecord()` creates/updates user record in Supabase using Auth0's user ID

### Logout Flow
1. User clicks logout
2. Redirected to `/api/auth/logout`
3. Auth0 SDK clears the session
4. User is redirected to home page

## Code Changes Summary

### Files Modified
- `lib/contexts/AuthContext.tsx` - Fetches session from Auth0 via `/auth/me`
- `components/Auth.tsx` - Simple link to `/auth/login`
- `proxy.ts` - Integrated Auth0 middleware and session checking
- `.env.example` - Added Auth0 configuration

### Files Created
- `lib/auth0.ts` - Auth0 client instance

### Files Removed
- `app/auth/callback/route.ts` - No longer needed (Auth0 middleware handles this)

### Files Unchanged (Still Work)
- `components/AuthGuard.tsx` - Still protects routes
- `lib/supabase/client.ts` - Still used for database queries
- `lib/supabase/server.ts` - Still used for server-side database queries
- `lib/utils/ensureUserRecord.ts` - Still creates user records
- All database-related code - Still works the same way

## Testing the Migration

### 1. Test Login
1. Navigate to `/auth`
2. Click "Continue with Google"
3. Complete Google OAuth flow with Auth0
4. You should be redirected to `/auth/callback` then to `/compare`
5. Check browser console for `[AUTH PROVIDER]` logs

### 2. Test User Profile
1. After logging in, check that:
   - Your email/name displays in the nav
   - Your user record exists in Supabase `users` table
   - Your profile loads correctly in `/settings`

### 3. Test Logout
1. Click your profile in the nav
2. Click "Sign out"
3. Verify you're redirected to home
4. Verify you can't access protected routes

### 4. Test Database Operations
1. Submit a vote on `/compare`
2. Submit a startup on `/submit`
3. Check portfolio on `/portfolio`
4. Verify all Supabase operations work

## Troubleshooting

### "Auth session missing!" errors gone?
✅ Yes! Auth0 handles authentication more reliably.

### User ID mismatch in database
- Auth0 user IDs use format: `google-oauth2|123456789`
- Make sure your Supabase queries use the correct user ID from Auth0
- Check `ensureUserRecord()` is being called correctly

### Redirect loops
- Verify `AUTH0_BASE_URL` matches your actual URL
- Check Allowed Callback URLs in Auth0 Dashboard
- Clear browser cookies and try again

### "Cannot find module" errors
- Run `bun install` again
- Restart your dev server
- Clear Next.js cache: `rm -rf .next`

## Production Deployment

### Environment Variables
Make sure to set these in your production environment (Vercel, etc.):

```
AUTH0_SECRET=<generated-secret>
AUTH0_BASE_URL=https://your-domain.com
AUTH0_ISSUER_BASE_URL=https://your-tenant.auth0.com
AUTH0_CLIENT_ID=<your-client-id>
AUTH0_CLIENT_SECRET=<your-client-secret>
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

### Auth0 Application Settings
Update the Allowed URLs in Auth0 Dashboard to include your production domain.

## Benefits of Auth0

1. **More Reliable**: No more hanging requests or timeout issues
2. **Better UX**: Faster login/logout flows
3. **More Providers**: Easy to add GitHub, Twitter, etc.
4. **Better Security**: Industry-standard auth with extensive security features
5. **Better Developer Experience**: Simpler SDK, better documentation
6. **Keep Supabase**: Still use Supabase for all your database needs

## Next Steps

- Test thoroughly in development
- Update production environment variables
- Deploy to production
- Monitor for any issues
- Consider adding more auth providers (GitHub, Twitter, etc.)
