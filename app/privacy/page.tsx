import Link from 'next/link'

export default function PrivacyPage() {
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
              Privacy Policy
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          {/* Content */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-8 shadow-sm">
            <div className="prose prose-gray dark:prose-invert max-w-none">
              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Information We Collect</h2>
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  When you use Linkra, we collect the following information:
                </p>
                <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 mb-4">
                  <li><strong>Authentication Data:</strong> When you sign in with Google OAuth, we receive your email address and name (if provided by Google).</li>
                  <li><strong>User Activity:</strong> We track your votes (pairwise voting), trades, and portfolio holdings.</li>
                  <li><strong>Usage Data:</strong> We may collect information about how you interact with the platform.</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">How We Use Your Information</h2>
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  We use the information we collect to:
                </p>
                <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 mb-4">
                  <li>Provide and improve our services</li>
                  <li>Calculate startup rankings based on collective votes</li>
                  <li>Display your portfolio and trading history</li>
                  <li>Show leaderboards and rankings</li>
                  <li>Ensure platform security and prevent abuse</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Data Storage and Security</h2>
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  Your data is stored securely using Supabase, which provides enterprise-grade security. We implement appropriate technical and organizational measures to protect your personal information.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Third-Party Services</h2>
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  We use the following third-party services:
                </p>
                <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 mb-4">
                  <li><strong>Google OAuth:</strong> For authentication. Google's privacy policy applies to your Google account data.</li>
                  <li><strong>Supabase:</strong> For database and authentication services.</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Your Rights</h2>
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  You have the right to:
                </p>
                <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 mb-4">
                  <li>Access your personal data</li>
                  <li>Request deletion of your account and data</li>
                  <li>Opt out of certain data collection</li>
                </ul>
                <p className="text-gray-700 dark:text-gray-300">
                  To exercise these rights, please contact us at{' '}
                  <a href="mailto:ly.eric2022@gmail.com" className="text-blue-600 dark:text-blue-400 hover:underline">
                    ly.eric2022@gmail.com
                  </a>
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Changes to This Policy</h2>
                <p className="text-gray-700 dark:text-gray-300">
                  We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Contact Us</h2>
                <p className="text-gray-700 dark:text-gray-300">
                  If you have any questions about this Privacy Policy, please contact us at{' '}
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

