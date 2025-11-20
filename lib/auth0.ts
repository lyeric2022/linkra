import { Auth0Client } from '@auth0/nextjs-auth0/server';

// Validate required environment variables
const requiredEnvVars = {
  AUTH0_SECRET: process.env.AUTH0_SECRET,
  APP_BASE_URL: process.env.APP_BASE_URL,
  AUTH0_DOMAIN: process.env.AUTH0_DOMAIN,
  AUTH0_ISSUER_BASE_URL: process.env.AUTH0_ISSUER_BASE_URL,
  AUTH0_CLIENT_ID: process.env.AUTH0_CLIENT_ID,
  AUTH0_CLIENT_SECRET: process.env.AUTH0_CLIENT_SECRET,
};

const missingVars = Object.entries(requiredEnvVars)
  .filter(([_, value]) => !value)
  .map(([key]) => key);

if (missingVars.length > 0) {
  console.error('❌ Missing required Auth0 environment variables:', missingVars.join(', '));
  console.error('📝 Please create a .env.local file with the following variables:');
  console.error(`
AUTH0_SECRET='<run: openssl rand -hex 32>'
APP_BASE_URL='http://localhost:3000'
AUTH0_DOMAIN='YOUR-TENANT.us.auth0.com'
AUTH0_ISSUER_BASE_URL='https://YOUR-TENANT.us.auth0.com'
AUTH0_CLIENT_ID='your-client-id'
AUTH0_CLIENT_SECRET='your-client-secret'
  `);
  console.error('📖 See AUTH0_SETUP_QUICK_START.md for detailed instructions');
  throw new Error(`Missing Auth0 environment variables: ${missingVars.join(', ')}`);
}

export const auth0 = new Auth0Client({
  routes: {
    login: '/auth/login',
    logout: '/auth/logout',
    callback: '/auth/callback',
  },
  session: {
    cookie: {
      // Ensure cookies work in production (HTTPS)
      sameSite: 'lax',
      // Only set secure in production
      ...(process.env.NODE_ENV === 'production' && {
        secure: true
      }),
    },
  },
});
