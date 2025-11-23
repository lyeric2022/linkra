/**
 * Next.js Instrumentation Hook
 * This runs once when the server starts up
 * Perfect for initializing background services
 *
 * Note: Must enable instrumentationHook in next.config.js
 */

export async function register() {
  // Only run on server side
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initializeServices } = await import('./lib/services/init-services')
    initializeServices()
  }
}
