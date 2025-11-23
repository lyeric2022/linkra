/**
 * Initialize background services
 * This should be called once when the app starts
 */

import { priceHistoryService } from './price-history-service'

let initialized = false

export function initializeServices() {
  // Prevent multiple initializations
  if (initialized) {
    return
  }

  // Only run on server side
  if (typeof window !== 'undefined') {
    return
  }

  console.log('🔧 [SERVICES] Initializing background services...')

  // Start price history service
  priceHistoryService.start()

  initialized = true
  console.log('✅ [SERVICES] Background services initialized')
}

// Cleanup on process exit
if (typeof process !== 'undefined') {
  process.on('SIGTERM', () => {
    console.log('🛑 [SERVICES] Shutting down background services...')
    priceHistoryService.stop()
  })

  process.on('SIGINT', () => {
    console.log('🛑 [SERVICES] Shutting down background services...')
    priceHistoryService.stop()
    process.exit(0)
  })
}
