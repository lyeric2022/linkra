/**
 * Simple logging utility with prefixes
 * Makes it easier to filter logs in console
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug'

const isDev = process.env.NODE_ENV === 'development'

export const logger = {
  info: (prefix: string, ...args: any[]) => {
    if (isDev) console.log(`ℹ️  [${prefix}]`, ...args)
  },
  warn: (prefix: string, ...args: any[]) => {
    console.warn(`⚠️  [${prefix}]`, ...args)
  },
  error: (prefix: string, ...args: any[]) => {
    console.error(`❌ [${prefix}]`, ...args)
  },
  debug: (prefix: string, ...args: any[]) => {
    if (isDev) console.debug(`🐛 [${prefix}]`, ...args)
  },
  success: (prefix: string, ...args: any[]) => {
    if (isDev) console.log(`✅ [${prefix}]`, ...args)
  },
}

