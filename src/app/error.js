'use client';

export default function Error({ error, reset }) {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl flex items-center justify-center text-white font-bold text-2xl mx-auto mb-6 shadow-xl">!</div>
        <h1 className="text-4xl font-extrabold text-white mb-3">Something went wrong</h1>
        <p className="text-gray-400 mb-8">An unexpected error occurred. This has been logged and we&apos;ll look into it.</p>
        <div className="flex flex-wrap gap-3 justify-center">
          <button onClick={reset} className="px-6 py-3 bg-gradient-to-r from-blue-600 to-violet-600 text-white font-bold rounded-xl hover:opacity-90 transition-all">
            Try again
          </button>
          <a href="/" className="px-6 py-3 bg-gray-800 text-gray-300 font-semibold rounded-xl hover:bg-gray-700 transition-all">
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}
