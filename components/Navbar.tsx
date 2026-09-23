'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Package, PlusCircle, Settings, PlaneTakeoff, User, LogOut, Shield } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string; name?: string; role?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const isAuthPage =
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/forgot-password' ||
    pathname === '/reset-password' ||
    pathname === '/verify-email';

  useEffect(() => {
    if (!isAuthPage) {
      fetch('/api/auth/me')
        .then((res) => (res.ok ? res.json() : { user: null }))
        .then((data) => {
          setCurrentUser(data.user);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [pathname, isAuthPage]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setCurrentUser(null);
      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const navItems = [
    { href: '/', label: 'Daftar Invoice', icon: Package },
    { href: '/invoices/new', label: 'Buat Invoice', icon: PlusCircle },
    { href: '/settings', label: 'Pengaturan Pricing', icon: Settings },
    { href: '/account', label: 'Akun Saya', icon: User },
  ];

  if (currentUser?.role === 'ADMIN') {
    navItems.push({ href: '/admin', label: 'Panel Admin', icon: Shield });
  }

  if (isAuthPage) {
    return (
      <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur border-b border-slate-800 text-white py-3">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
              <PlaneTakeoff className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg bg-gradient-to-r from-sky-400 to-indigo-300 bg-clip-text text-transparent">
              Jastip Pro
            </span>
          </Link>
          <div className="flex items-center space-x-3 text-sm">
            <Link
              href="/login"
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                pathname === '/login' ? 'bg-sky-600 text-white' : 'text-slate-300 hover:text-white'
              }`}
            >
              Masuk
            </Link>
            <Link
              href="/register"
              className={`px-3 py-1.5 rounded-lg font-medium border border-sky-500/40 text-sky-400 hover:bg-sky-500/10 transition`}
            >
              Daftar
            </Link>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur border-b border-slate-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20 group-hover:scale-105 transition-transform">
              <PlaneTakeoff className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-sky-400 to-indigo-300 bg-clip-text text-transparent">
                Jastip Pro
              </span>
              <span className="block text-[10px] text-slate-400 font-medium tracking-wide">
                KR ↔ ID INVOICE SYSTEM
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="flex items-center space-x-1 sm:space-x-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              const isAdminTab = item.href === '/admin';
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? isAdminTab
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-sm'
                        : 'bg-sky-600/20 text-sky-400 border border-sky-500/30 shadow-sm'
                      : isAdminTab
                      ? 'text-amber-400/90 hover:text-amber-300 hover:bg-amber-500/10'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden md:inline">{item.label}</span>
                </Link>
              );
            })}

            {/* Logout Button */}
            {currentUser && (
              <button
                onClick={handleLogout}
                title="Keluar / Logout"
                className="flex items-center space-x-1.5 px-3 py-2 ml-2 rounded-lg text-sm font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden md:inline">Keluar</span>
              </button>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
