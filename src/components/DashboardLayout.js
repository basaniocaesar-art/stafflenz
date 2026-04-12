'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';

const industryConfig = {
  factory:      { label: 'Factory',      icon: '🏭' },
  hotel:        { label: 'Hotel',        icon: '🏨' },
  school:       { label: 'School',       icon: '🏫' },
  retail:       { label: 'Retail',       icon: '🛍️' },
  restaurant:   { label: 'Restaurant',   icon: '🍽️' },
  warehouse:    { label: 'Warehouse',    icon: '📦' },
  construction: { label: 'Construction', icon: '🏗️' },
  hospital:     { label: 'Hospital',     icon: '🏥' },
  security:     { label: 'Security',     icon: '🔒' },
  gym:          { label: 'Gym',          icon: '🏋️' },
};

const NAV_ICONS = {
  dashboard: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
  ),
  workers: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
  ),
  attendance: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
  ),
  zones: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M23 7l-7 5-4-4-7 5"/><rect x="1" y="3" width="22" height="18" rx="2"/></svg>
  ),
};

export default function DashboardLayout({ children, industry, clientName, userName }) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const config = industryConfig[industry] || industryConfig.factory;

  const navItems = [
    { href: `/${industry}`, label: 'Dashboard',    key: 'dashboard'  },
    { href: '/workers',     label: 'Workers',      key: 'workers'    },
    { href: '/attendance',  label: 'Schedule',     key: 'attendance' },
    { href: '/zones',       label: 'Camera Zones', key: 'zones'      },
  ];

  async function handleLogout() {
    setLoggingOut(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  const sidebarStyle = { background: '#0a1128', borderColor: '#1e2d4a' };
  const mainStyle    = { background: '#070d1b' };

  return (
    <div className="min-h-screen flex" style={mainStyle}>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-56 flex flex-col transform transition-transform lg:translate-x-0 lg:static lg:z-auto border-r ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={sidebarStyle}
      >
        {/* Brand */}
        <div className="p-4 border-b" style={{borderColor:'#1e2d4a'}}>
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center font-extrabold text-sm text-white shadow-lg" style={{background:'linear-gradient(135deg,#3b82f6,#8b5cf6)'}}>
              S
            </div>
            <div>
              <div className="font-extrabold text-white text-sm tracking-tight">Stafflenz</div>
              <div className="text-[10px] truncate max-w-[110px]" style={{color:'#475569'}}>{clientName}</div>
            </div>
          </Link>
        </div>

        {/* Industry badge */}
        <div className="px-4 py-3 border-b" style={{borderColor:'#1e2d4a'}}>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold" style={{background:'rgba(59,130,246,0.12)',color:'#60a5fa',border:'1px solid rgba(59,130,246,0.2)'}}>
            <span>{config.icon}</span>
            <span>{config.label}</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={isActive
                  ? {background:'rgba(59,130,246,0.15)',color:'#60a5fa',border:'1px solid rgba(59,130,246,0.25)'}
                  : {color:'#64748b',border:'1px solid transparent'}
                }
              >
                {NAV_ICONS[item.key]}
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User / Logout */}
        <div className="p-3 border-t" style={{borderColor:'#1e2d4a'}}>
          <div className="flex items-center gap-2.5 px-2 py-2 mb-1">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{background:'linear-gradient(135deg,#3b82f6,#8b5cf6)'}}>
              {userName?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-white truncate">{userName || 'User'}</div>
              <div className="text-[10px]" style={{color:'#475569'}}>Admin</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-xl transition-all disabled:opacity-50"
            style={{color:'#ef4444'}}
            onMouseEnter={e => e.currentTarget.style.background='rgba(239,68,68,0.1)'}
            onMouseLeave={e => e.currentTarget.style.background='transparent'}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            {loggingOut ? 'Signing out...' : 'Sign Out'}
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="lg:hidden sticky top-0 z-10 border-b px-4 h-14 flex items-center justify-between" style={{background:'#0a1128',borderColor:'#1e2d4a'}}>
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg" style={{color:'#64748b'}}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
          <span className="font-extrabold text-white tracking-tight">Stafflenz</span>
          <div className="w-8" />
        </header>

        <main className="flex-1 p-4 sm:p-6 overflow-auto" style={{color:'#e2e8f0'}}>
          {children}
        </main>
      </div>
    </div>
  );
}
