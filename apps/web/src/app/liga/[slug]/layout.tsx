'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { tenantApi, assetUrl } from '@/lib/api';
import { PublicLeagueProvider } from '@/lib/public-league-context';

interface PublicTenant {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  bannerUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}

export default function PublicLeagueLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const slug = params.slug as string;
  const [tenant, setTenant] = useState<PublicTenant | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!slug) return;
    tenantApi.getBySlug(slug)
      .then(setTenant)
      .catch(() => setError(true));
  }, [slug]);

  useEffect(() => {
    if (!tenant) return;
    document.documentElement.style.setProperty('--color-primary', tenant.primaryColor);
    document.documentElement.style.setProperty('--color-secondary', tenant.secondaryColor);
    document.documentElement.style.setProperty('--color-accent', tenant.accentColor);
  }, [tenant]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Liga no encontrada</h1>
          <p className="text-gray-500 mb-6">No existe una liga con el identificador &quot;{slug}&quot;</p>
          <Link href="/" className="text-primary hover:underline">Volver al inicio</Link>
        </div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse text-gray-500">Cargando liga...</div>
      </div>
    );
  }

  const basePath = `/liga/${slug}`;
  const tabs = [
    { name: 'Inicio', href: basePath },
    { name: 'Posiciones', href: `${basePath}/posiciones` },
    { name: 'Fixture', href: `${basePath}/fixture` },
    { name: 'Goleadores', href: `${basePath}/goleadores` },
  ];

  return (
    <PublicLeagueProvider league={{ id: tenant.id, name: tenant.name, slug: tenant.slug }}>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header style={{ backgroundColor: tenant.primaryColor }} className="text-white">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <Link href={basePath} className="flex items-center gap-3">
                {tenant.logoUrl ? (
                  <img src={assetUrl(tenant.logoUrl)} alt={tenant.name} className="w-10 h-10 rounded-lg bg-white/10 object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center font-bold text-xl">
                    {tenant.name[0]}
                  </div>
                )}
                <div>
                  <h1 className="font-bold text-lg leading-tight">{tenant.name}</h1>
                  <p className="text-xs text-white/70">Portal Publico</p>
                </div>
              </Link>
              <Link href="/login" className="text-sm text-white/70 hover:text-white transition-colors">
                Ingresar
              </Link>
            </div>
          </div>

          {/* Navigation tabs */}
          <div className="container mx-auto px-4">
            <nav className="flex gap-1 -mb-px overflow-x-auto">
              {tabs.map(tab => {
                const isActive = pathname === tab.href;
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap flex-shrink-0 ${
                      isActive
                        ? 'bg-gray-50 text-gray-900'
                        : 'text-white/80 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {tab.name}
                  </Link>
                );
              })}
            </nav>
          </div>
        </header>

        {/* Content */}
        <main className="container mx-auto px-4 py-6">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-gray-200 mt-12 py-6">
          <div className="container mx-auto px-4 flex items-center justify-between text-sm text-gray-400">
            <span>{tenant.name}</span>
            <span>Powered by <Link href="/" className="text-primary hover:underline">AUFA</Link></span>
          </div>
        </footer>
      </div>
    </PublicLeagueProvider>
  );
}
