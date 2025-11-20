# Auth0 Quick Start Guide

## 1. Create Auth0 Application

1. Go to https://manage.auth0.com/dashboard/
2. Create a **Regular Web Application**
3. Note your **Domain**, **Client ID**, and **Client Secret**

## 2. Configure Auth0 Application

In your Auth0 application settings:

### Application URIs
- **Application Login URI**: Leave EMPTY
- **Initiate Login URI**: Leave EMPTY

### URLs
- **Allowed Callback URLs**: `http://localhost:3000/auth/callback`
- **Allowed Logout URLs**: `http://localhost:3000`
- **Allowed Web Origins**: `http://localhost:3000`

## 3. Enable Google

1. Go to **Authentication → Social**
2. Enable **Google**
3. Use Auth0 dev keys or add your own Google OAuth credentials

## 4. Set Environment Variables

Create `.env.local`:

```bash
# Generate secret
openssl rand -hex 32

# Add to .env.local
AUTH0_SECRET='<paste-generated-secret>'
APP_BASE_URL='http://localhost:3000'
AUTH0_ISSUER_BASE_URL='https://YOUR-TENANT.us.auth0.com'
AUTH0_CLIENT_ID='your-client-id-here'
AUTH0_CLIENT_SECRET='your-client-secret-here'

# Keep your existing Supabase vars
NEXT_PUBLIC_SUPABASE_URL=your-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## 5. Start Dev Server

```bash
bun run dev
```

## 6. Test

1. Visit http://localhost:3000/auth
2. Click "Continue with Google"
3. Complete Auth0 login
4. Should redirect to `/compare`

## Troubleshooting

### "Callback URL mismatch" error
- Make sure callback URL in Auth0 is exactly: `http://localhost:3000/auth/callback`

### "Access denied" error
- Check that Google connection is enabled in Auth0
- Verify your Auth0 credentials in `.env.local`

### Still seeing Supabase auth errors
- Clear browser cookies
- Restart dev server
- Clear `.next` cache: `rm -rf .next`

## Auth Routes (Handled by Auth0 Middleware)

- `/auth/login` - Starts login flow
- `/auth/callback` - OAuth callback
- `/auth/logout` - Logs out user
- `/auth/me` - Returns current user (API endpoint)

All these routes are automatically handled by the Auth0 middleware in `proxy.ts`.
