import { NextResponse } from 'next/server';

export async function GET() {
  // Check which Auth0 environment variables are set (without revealing values)
  const envCheck = {
    AUTH0_SECRET: !!process.env.AUTH0_SECRET,
    APP_BASE_URL: process.env.APP_BASE_URL || 'NOT SET',
    AUTH0_DOMAIN: process.env.AUTH0_DOMAIN || 'NOT SET',
    AUTH0_ISSUER_BASE_URL: process.env.AUTH0_ISSUER_BASE_URL || 'NOT SET',
    AUTH0_CLIENT_ID: !!process.env.AUTH0_CLIENT_ID,
    AUTH0_CLIENT_SECRET: !!process.env.AUTH0_CLIENT_SECRET,
    NODE_ENV: process.env.NODE_ENV,
  };

  return NextResponse.json(envCheck);
}
