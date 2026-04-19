import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="text-center">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-violet-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl mx-auto mb-6 shadow-xl">LA</div>
        <h1 className="text-6xl font-extrabold text-white mb-3">404</h1>
        <p className="text-lg text-gray-400 mb-8">This page doesn&apos;t exist or has been moved.</p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/" className="px-6 py-3 bg-gradient-to-r from-blue-600 to-violet-600 text-white font-bold rounded-xl hover:opacity-90 transition-all">
            Go home
          </Link>
          <Link href="/login" className="px-6 py-3 bg-gray-800 text-gray-300 font-semibold rounded-xl hover:bg-gray-700 transition-all">
            Log in
          </Link>
        </div>
      </div>
    </div>
  );
}
