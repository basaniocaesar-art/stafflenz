'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';

const industryConfig = {
  factory:      { label: 'Factory',      icon: '🏭', color: 'bg-orange-600',  accent: 'text-orange-600 bg-orange-50' },
  hotel:        { label: 'Hotel',        icon: '🏨', color: 'bg-purple-600',  accent: 'text-purple-600 bg-purple-50' },
  school:       { label: 'School',       icon: '🏫', color: 'bg-green-600',   accent: 'text-green-600 bg-green-50' },
  retail:       { label: 'Retail',       icon: '🛍️', color: 'bg-pink-600',    accent: 'text-pink-600 bg-pink-50' },
  restaurant:   { label: 'Restaurant',   icon: '🍽️', color: 'bg-amber-600',   accent: 'text-amber-600 bg-amber-50' },
  warehouse:    { label: 'Warehouse',    icon: '📦', color: 'bg-indigo-600',  accent: 'text-indigo-600 bg-indigo-50' },
  construction: { label: 'Construction', icon: '🏗️', color: 'bg-yellow-600',  accent: 'text-yellow-700 bg-yellow-50' },
  hospital:     { label: 'Hospital',     icon: '🏥', color: 'bg-cyan-600',    accent: 'text-cyan-600 bg-cyan-50' },
  security:     { label: 'Security',     icon: '🔒', color: 'bg-slate-600',   accent: 'text-slate-600 bg-slate-100' },
};

export default function DashboardLayout({ children, industry, clientName, userName }) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const config = industryConfig[industry] || industryConfig.factory;

  const navItems = [
    { href: `/${industry}`, label: 'Dashboard', icon: '📊' },
    { href: '/attendance', label: 'Attendance', icon: '🕐' },
    { href: '/workers', label: 'Workers', icon: '👷' },
    { href: '/zones', label: 'Camera Zones', icon: '📹' },
  ];

  async function handleLogout() {
    setLoggingOut(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 flex flex-col transform transition-transform lg:translate-x-0 lg:static lg:z-auto ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Brand */}
        <div className="p-4 border-b border-gray-100">
          <Link href="/" className="flex items-center gap-2">
            <div className={`w-8 h-8 ${config.color} rounded-lg flex items-center justify-center text-white font-bold text-sm`}>SL</div>
            <div>
              <div className="font-bold text-gray-900 text-sm">StaffLenz</div>
              <div className="text-xs text-gray-500">{clientName}</div>
            </div>
          </Link>
        </div>

        {/* Industry badge */}
        <div className="px-4 py-3 border-b border-gray-100">
          <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${config.accent}`}>
            <span>{config.icon}</span>
            <span>{config.label}</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User / Logout */}
        <div className="p-3 border-t border-gray-100">
          <div className="flex items-center gap-3 px-3 py-2 mb-1">
            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-medium text-sm">
              {userName?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">{userName}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
          >
            <span>🚪</span> {loggingOut ? 'Signing out...' : 'Sign Out'}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar (mobile) */}
        <header className="lg:hidden sticky top-0 z-10 bg-white border-b border-gray-200 px-4 h-14 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-gray-100">
            <span className="sr-only">Open menu</span>
            <div className="w-5 h-0.5 bg-gray-600 mb-1"></div>
            <div className="w-5 h-0.5 bg-gray-600 mb-1"></div>
            <div className="w-5 h-0.5 bg-gray-600"></div>
          </button>
          <span className="font-semibold text-gray-900">StaffLenz</span>
          <div className="w-8"></div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
