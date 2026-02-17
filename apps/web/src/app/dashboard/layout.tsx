'use client';

import { useAuth } from '@/lib/auth-context';
import { useTenant } from '@/lib/tenant-context';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

const navigation = [
  { name: 'Inicio', href: '/dashboard', icon: 'H' },
  { name: 'Torneos', href: '/dashboard/tournaments', icon: 'T' },
  { name: 'Equipos', href: '/dashboard/teams', icon: 'E' },
  { name: 'Partidos', href: '/dashboard/matches', icon: 'P' },
  { name: 'Posiciones', href: '/dashboard/standings', icon: 'ST' },
  { name: 'Arbitros', href: '/dashboard/referees', icon: 'AR' },
  { name: 'Finanzas', href: '/dashboard/treasury', icon: '$' },
  { name: 'Sanciones', href: '/dashboard/sanctions', icon: 'SN' },
  { name: 'Mi AUFA ID', href: '/dashboard/passport', icon: 'ID' },
  { name: 'Administrar', href: '/dashboard/admin', icon: 'AD' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const { tenant } = useTenant();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Cargando...</div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Brand */}
        <div className="p-6 border-b border-gray-100">
          <Link href="/dashboard" className="flex items-center gap-3">
            {tenant?.branding.logoUrl ? (
              <img src={tenant.branding.logoUrl} alt={tenant.name} className="w-8 h-8 rounded" />
            ) : (
              <div className="w-8 h-8 bg-primary rounded flex items-center justify-center text-white font-bold text-sm">
                {tenant?.name?.[0] || 'A'}
              </div>
            )}
            <span className="font-semibold text-gray-900 truncate">
              {tenant?.name || 'AUFA'}
            </span>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <span className={`w-7 h-7 rounded flex items-center justify-center text-xs font-bold ${
                  isActive ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500'
                }`}>
                  {item.icon}
                </span>
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center text-white text-sm font-bold">
              {user?.fullName?.[0] || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.fullName}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="mt-3 w-full text-sm text-gray-500 hover:text-red-600 transition-colors text-left"
          >
            Cerrar sesion
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
