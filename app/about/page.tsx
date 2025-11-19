import Link from 'next/link'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link 
              href="/" 
              className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors mb-4"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Home
            </Link>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              About Linkra
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Building a global startup league table through collective intelligence
            </p>
          </div>

          {/* Content */}
          <div className="space-y-6">
            {/* Mission */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-8 shadow-sm">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Our Mission</h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                Linkra is a startup league table built through collective voting. We believe that the wisdom of the crowd can create a more accurate and dynamic ranking of startups than traditional methods. By combining pairwise comparisons with virtual trading, we capture both relative conviction and market sentiment.
              </p>
            </div>

            {/* How It Works */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-8 shadow-sm">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">How It Works</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">1. Vote</h3>
                  <p className="text-gray-700 dark:text-gray-300">
                    See two startups side-by-side and vote for which one you believe in more. Every vote contributes to the global ranking algorithm.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">2. Rank</h3>
                  <p className="text-gray-700 dark:text-gray-300">
                    Our Elo-based ranking system processes thousands of votes to create an emergent ordering of startups. The more votes a startup receives, the more accurate its ranking becomes.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">3. Trade</h3>
                  <p className="text-gray-700 dark:text-gray-300">
                    Back your beliefs with virtual currency. Build a portfolio and track your performance against the market. Prices are derived from Elo ratings, creating a dynamic market that reflects collective conviction.
                  </p>
                </div>
              </div>
            </div>

            {/* Ranking Algorithm */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-8 shadow-sm">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Ranking Algorithm</h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Linkra uses an Elo rating system, similar to chess rankings, to determine startup positions:
              </p>
              <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 mb-4">
                <li>Each startup starts with an Elo rating of 1500</li>
                <li>When you vote for a startup, its Elo increases while the opponent's decreases</li>
                <li>The magnitude of change depends on the Elo difference between the two startups</li>
                <li>Upsets (voting for the lower-rated startup) result in larger rating changes</li>
                <li>Prices are calculated as Elo rating divided by 100 (e.g., Elo 1500 = $15.00)</li>
              </ul>
              <p className="text-gray-700 dark:text-gray-300">
                This creates a self-correcting system where startups naturally find their position based on collective judgment.
              </p>
            </div>

            {/* Data Sources */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-8 shadow-sm">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Data Sources</h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Startup information is sourced from publicly available data. We credit the following:
              </p>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <strong>Y Combinator Companies API:</strong> Startup data is provided by the{' '}
                  <a 
                    href="https://github.com/yc-oss/api" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Y Combinator Open Source API
                  </a>
                  , an unofficial API for Y Combinator companies fetched from the Y Combinator website's Algolia search index.
                </p>
              </div>
              <p className="text-gray-700 dark:text-gray-300">
                Rankings, prices, and all market data are generated by user activity on the platform and do not reflect official Y Combinator rankings or valuations.
              </p>
            </div>

            {/* Technology */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-8 shadow-sm">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Technology</h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Linkra is built with modern web technologies:
              </p>
              <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2">
                <li><strong>Next.js:</strong> React framework for server-side rendering and routing</li>
                <li><strong>TypeScript:</strong> Type-safe JavaScript</li>
                <li><strong>Supabase:</strong> Backend-as-a-Service for authentication, database, and real-time features</li>
                <li><strong>Tailwind CSS:</strong> Utility-first CSS framework</li>
                <li><strong>Recharts:</strong> Charting library for price history visualization</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

