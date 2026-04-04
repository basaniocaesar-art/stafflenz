'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function WhitelabelIndex() {
  const router = useRouter();

  useEffect(() => {
    fetch('/api/whitelabel/stats')
      .then((r) => {
        if (r.status === 401 || r.status === 403) {
          router.push('/login?redirect=/whitelabel/dashboard');
        } else if (r.ok) {
          router.push('/whitelabel/dashboard');
        } else {
          router.push('/login?redirect=/whitelabel/dashboard');
        }
      })
      .catch(() => {
        router.push('/login?redirect=/whitelabel/dashboard');
      });
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-400 font-medium">Checking access…</p>
      </div>
    </div>
  );
}
