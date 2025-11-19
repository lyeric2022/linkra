import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Explicitly set Turbopack root to current directory to avoid lockfile detection issues
  turbopack: {
    root: __dirname,
  },
  // Environment variables are configured in Vercel Dashboard
}

export default nextConfig

