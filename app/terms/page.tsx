import Link from 'next/link'

export default function TermsPage() {
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
              Terms of Service
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          {/* Content */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-8 shadow-sm">
            <div className="prose prose-gray dark:prose-invert max-w-none">
              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Acceptance of Terms</h2>
                <p className="text-gray-700 dark:text-gray-300">
                  By accessing and using Linkra, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to these Terms of Service, please do not use the platform.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Description of Service</h2>
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  Linkra is a platform that allows users to:
                </p>
                <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 mb-4">
                  <li>Vote on startups through pairwise voting</li>
                  <li>View global startup rankings based on collective votes</li>
                  <li>Trade virtual positions in startups using virtual currency</li>
                  <li>Track portfolio performance and compete on leaderboards</li>
                </ul>
                <p className="text-gray-700 dark:text-gray-300">
                  All trading is virtual and does not involve real money or actual ownership of startups.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">User Accounts</h2>
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  To use Linkra, you must:
                </p>
                <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 mb-4">
                  <li>Sign in using Google OAuth</li>
                  <li>Provide accurate and complete information</li>
                  <li>Maintain the security of your account</li>
                  <li>Be at least 13 years old (or the minimum age in your jurisdiction)</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Virtual Currency and Trading</h2>
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  Linkra uses virtual currency for trading purposes only. This virtual currency:
                </p>
                <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 mb-4">
                  <li>Has no real-world value</li>
                  <li>Cannot be exchanged for real money</li>
                  <li>Cannot be transferred between users</li>
                  <li>Is provided solely for entertainment and educational purposes</li>
                </ul>
                <p className="text-gray-700 dark:text-gray-300">
                  All trades are simulated and do not represent actual ownership or investment in any startup.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">User Conduct</h2>
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  You agree not to:
                </p>
                <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 mb-4">
                  <li>Attempt to manipulate rankings through fraudulent voting</li>
                  <li>Use automated systems or bots to interact with the platform</li>
                  <li>Harass, abuse, or harm other users</li>
                  <li>Violate any applicable laws or regulations</li>
                  <li>Interfere with or disrupt the platform's operation</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Intellectual Property</h2>
                <p className="text-gray-700 dark:text-gray-300">
                  The Linkra platform, including its design, features, and functionality, is owned by Linkra and protected by copyright and other intellectual property laws. Startup information is sourced from publicly available data and is used for informational purposes only.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Disclaimer of Warranties</h2>
                <p className="text-gray-700 dark:text-gray-300">
                  Linkra is provided "as is" without warranties of any kind, either express or implied. We do not guarantee the accuracy, completeness, or usefulness of any information on the platform. Rankings and prices are based on user votes and are for entertainment purposes only.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Limitation of Liability</h2>
                <p className="text-gray-700 dark:text-gray-300">
                  To the fullest extent permitted by law, Linkra shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the platform.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Termination</h2>
                <p className="text-gray-700 dark:text-gray-300">
                  We reserve the right to suspend or terminate your account at any time for violation of these Terms of Service or for any other reason we deem necessary.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Changes to Terms</h2>
                <p className="text-gray-700 dark:text-gray-300">
                  We reserve the right to modify these Terms of Service at any time. We will notify users of any material changes by updating the "Last updated" date on this page.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Contact</h2>
                <p className="text-gray-700 dark:text-gray-300">
                  If you have any questions about these Terms of Service, please contact us at{' '}
                  <a href="mailto:ly.eric2022@gmail.com" className="text-blue-600 dark:text-blue-400 hover:underline">
                    ly.eric2022@gmail.com
                  </a>
                </p>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

