import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-12 md:py-16">
        <div className="max-w-6xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12 sm:mb-16">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6 px-2">
              Rank Startups Head-to-Head
            </h1>
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-600 dark:text-gray-400 mb-6 sm:mb-8 max-w-3xl mx-auto px-2">
              Build a global startup league table through pairwise votes, then trade virtual positions in a simulated market.
            </p>
            
            {/* <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-2">
              <Link
                href="/compare"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-black dark:bg-white text-white dark:text-black rounded-xl font-semibold hover:opacity-90 active:scale-95 transition-all shadow-lg hover:shadow-xl text-sm sm:text-base"
              >
                Start Voting
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
              <Link
                href="/rankings"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3 sm:py-4 border-2 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 transition-all text-sm sm:text-base"
              >
                View Rankings
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </Link>
            </div> */}
          </div>

          {/* Features Grid */}
          <div className="grid sm:grid-cols-3 gap-8 mb-12">
            {/* Vote Feature */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Vote</h2>
              <p className="text-sm text-gray-500 dark:text-gray-500 leading-relaxed">
                See two startups side-by-side and vote for which one you believe in more. Every vote builds the global ranking.
              </p>
            </div>

            {/* Rank Feature */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Rank</h2>
              <p className="text-sm text-gray-500 dark:text-gray-500 leading-relaxed">
                Watch as thousands of micro-decisions create an emergent ordering of startups based on collective conviction.
              </p>
            </div>

            {/* Trade Feature */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Trade</h2>
              <p className="text-sm text-gray-500 dark:text-gray-500 leading-relaxed">
                Back your beliefs with virtual currency. Build a portfolio and track your performance against the market.
              </p>
            </div>
          </div>

          {/* Quick Stats or CTA */}
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 dark:from-white dark:to-gray-100 rounded-xl border border-gray-200 dark:border-gray-800 p-6 sm:p-8 text-center shadow-lg">
            <h2 className="text-xl sm:text-2xl font-bold text-white dark:text-gray-900 mb-2 sm:mb-3">
              Ready to Start Ranking?
            </h2>
            <p className="text-sm sm:text-base text-white/80 dark:text-gray-600 mb-4 sm:mb-6 max-w-2xl mx-auto">
              Join the community and help build the definitive startup league table through your votes.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              <Link
                href="/compare"
                className="inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl font-semibold hover:opacity-90 active:scale-95 transition-all shadow-lg text-sm sm:text-base"
              >
                Get Started
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <a
                href="https://discord.gg/2s4ghSME34"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3 sm:py-4 border-2 border-white/20 dark:border-gray-800 text-white dark:text-gray-900 rounded-xl font-semibold hover:bg-white/10 dark:hover:bg-gray-100 active:scale-95 transition-all text-sm sm:text-base"
              >
                Join Discord
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 mt-20 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4 sm:px-6 py-12">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 mb-8">
              {/* Brand */}
              <div className="col-span-2 md:col-span-1">
                <Link href="/" className="inline-block mb-4">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Linkra</h2>
                </Link>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  A startup league table built through collective voting and virtual trading.
                </p>
              </div>

              {/* Contact */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 uppercase tracking-wider">Contact</h3>
                <ul className="space-y-3 text-sm">
                  <li>
                    <Link href="/contact" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
                      Get in touch
                    </Link>
                  </li>
                  <li>
                    <a 
                      href="https://discord.gg/2s4ghSME34" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                    >
                      Join Discord
                    </a>
                  </li>
                </ul>
              </div>

              {/* Legal */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 uppercase tracking-wider">Legal</h3>
                <ul className="space-y-3 text-sm">
                  <li>
                    <Link href="/privacy" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
                      Privacy Policy
                    </Link>
                  </li>
                  <li>
                    <Link href="/terms" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
                      Terms of Service
                    </Link>
                  </li>
                </ul>
              </div>

              {/* About */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 uppercase tracking-wider">About</h3>
                <ul className="space-y-3 text-sm">
                  <li>
                    <Link href="/about" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
                      Learn more
                    </Link>
                  </li>
                </ul>
              </div>
            </div>

            {/* Bottom Bar */}
            <div className="pt-8 border-t border-gray-200 dark:border-gray-800">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  © {new Date().getFullYear()} Linkra. All rights reserved.
                </p>
                <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
                  <a 
                    href="https://github.com/yc-oss/api" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                  >
                    Powered by YC API
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </main>
  )
}
