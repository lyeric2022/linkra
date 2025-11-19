// Quick test page to verify Tailwind is working
export default function TestTailwind() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-8 max-w-md">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Tailwind Test
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          If you see styled content, Tailwind is working! 🎉
        </p>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">
            Button 1
          </button>
          <button className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors">
            Button 2
          </button>
        </div>
        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="h-16 bg-red-200 rounded"></div>
          <div className="h-16 bg-green-200 rounded"></div>
          <div className="h-16 bg-blue-200 rounded"></div>
        </div>
      </div>
    </div>
  )
}

