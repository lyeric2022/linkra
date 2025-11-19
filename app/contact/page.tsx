'use client'

import Link from 'next/link'

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-10">
            <Link 
              href="/" 
              className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 transition-colors mb-8"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Home
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Contact
            </h1>
            <p className="text-gray-500 dark:text-gray-500">
              Get in touch — especially if you're looking to contribute, collaborate, sponsor, or invest!
            </p>
          </div>

          {/* Opportunities Section */}
          <div className="mb-10">
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Linkra is always looking for partners, contributors, and supporters. Whether you want to contribute code, collaborate on features, sponsor the platform, or invest in our vision, we'd love to hear from you!
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="text-sm">
                <div className="font-medium text-gray-900 dark:text-white mb-1">Contribute</div>
                <div className="text-gray-500 dark:text-gray-500">Code, design, or ideas</div>
              </div>
              <div className="text-sm">
                <div className="font-medium text-gray-900 dark:text-white mb-1">Collaborate</div>
                <div className="text-gray-500 dark:text-gray-500">Features & integrations</div>
              </div>
              <div className="text-sm">
                <div className="font-medium text-gray-900 dark:text-white mb-1">Sponsor</div>
                <div className="text-gray-500 dark:text-gray-500">Support & visibility</div>
              </div>
              <div className="text-sm">
                <div className="font-medium text-gray-900 dark:text-white mb-1">Invest</div>
                <div className="text-gray-500 dark:text-gray-500">Future of startup rankings</div>
              </div>
            </div>
          </div>

          {/* Contact Links */}
          <div className="space-y-3">
            <a
              href="mailto:ly.eric2022@gmail.com"
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-white dark:hover:bg-gray-900 transition-colors group"
            >
              <svg className="w-5 h-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 dark:text-white">Email</div>
                <div className="text-sm text-gray-500 dark:text-gray-500 break-all">
                  ly.eric2022@gmail.com
                </div>
              </div>
            </a>

            <a
              href="https://x.com/lyyeric"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-white dark:hover:bg-gray-900 transition-colors group"
            >
              <svg className="w-5 h-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 dark:text-white">Twitter</div>
                <div className="text-sm text-gray-500 dark:text-gray-500">
                  x.com/lyyeric
                </div>
              </div>
            </a>

            <a
              href="https://lyyeric.tech"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-white dark:hover:bg-gray-900 transition-colors group"
            >
              <svg className="w-5 h-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 dark:text-white">Website</div>
                <div className="text-sm text-gray-500 dark:text-gray-500">
                  lyyeric.tech
                </div>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

