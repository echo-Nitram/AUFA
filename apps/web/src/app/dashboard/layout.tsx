'use client';

import { useAuth } from '@/lib/auth-context';
import { useTenant } from '@/lib/tenant-context';
import { assetUrl } from '@/lib/api';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const navigation = [
  { name: 'Inicio', href: '/dashboard', icon: 'H' },
  { name: 'Torneos', href: '/dashboard/tournaments', icon: 'T' },
  { name: 'Equipos', href: '/dashboard/teams', icon: 'E' },
  { name: 'Partidos', href: '/dashboard/matches', icon: 'P' },
  { name: 'Posiciones', href: '/dashboard/standings', icon: 'ST' },
  { name: 'Canchas', href: '/dashboard/venues', icon: 'CA' },
  { name: 'Arbitros', href: '/dashboard/referees', icon: 'AR' },
  { name: 'Finanzas', href: '/dashboard/treasury', icon: '$' },
  { name: 'Sanciones', href: '/dashboard/sanctions', icon: 'SN' },
  { name: 'Mi AUFA ID', href: '/dashboard/passport', icon: 'ID' },
  { name: 'Identidad', href: '/dashboard/identity', icon: 'VI' },
  { name: 'Administrar', href: '/dashboard/admin', icon: 'AD' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const { tenant } = useTenant();
  const pathname = usePathname();
  const router = useRouter();
  const [isNavOpen, setIsNavOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  // En celular el menu es un panel deslizante: al navegar tiene que cerrarse solo.
  useEffect(() => {
    setIsNavOpen(false);
  }, [pathname]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Cargando...</div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const brand = (
    <>
      {tenant?.branding.logoUrl ? (
        <img src={assetUrl(tenant.branding.logoUrl)} alt={tenant.name} className="w-8 h-8 rounded object-cover flex-shrink-0" />
      ) : (
        <div className="w-8 h-8 bg-primary rounded flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
          {tenant?.name?.[0] || 'A'}
        </div>
      )}
      <span className="font-semibold text-gray-900 truncate">{tenant?.name || 'AUFA'}</span>
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50 lg:flex">
      {/* Barra superior: solo en celular, donde el sidebar fijo no entra */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center gap-3 h-14 px-4 bg-white border-b border-gray-200">
        <button
          type="button"
          onClick={() => setIsNavOpen(true)}
          aria-label="Abrir menu"
          aria-expanded={isNavOpen}
          className="-ml-2 p-2 rounded-lg text-gray-600 hover:bg-gray-100"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <Link href="/dashboard" className="flex items-center gap-2 min-w-0">
          {brand}
        </Link>
      </header>

      {/* Fondo oscuro del panel deslizante */}
      {isNavOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-gray-900/40"
          onClick={() => setIsNavOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar: panel deslizante en celular, columna fija desde lg */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col overflow-y-auto
          transition-transform duration-200 lg:static lg:z-auto lg:translate-x-0 lg:transition-none
          ${isNavOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Marca */}
        <div className="flex items-center justify-between gap-2 p-6 border-b border-gray-100">
          <Link href="/dashboard" className="flex items-center gap-3 min-w-0">
            {brand}
          </Link>
          <button
            type="button"
            onClick={() => setIsNavOpen(false)}
            aria-label="Cerrar menu"
            className="lg:hidden -mr-2 p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
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
                <span className={`w-7 h-7 rounded flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  isActive ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500'
                }`}>
                  {item.icon}
                </span>
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Usuario */}
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
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

      {/* Contenido. min-w-0 evita que un hijo ancho estire la columna flex. */}
      <main className="flex-1 min-w-0">
        <div className="p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
