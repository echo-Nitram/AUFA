import Link from 'next/link';
import { ReactNode } from 'react';

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-gray-200 bg-white">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-lg font-bold text-white">
              A
            </span>
            <span className="text-xl font-bold text-gray-900">AUFA</span>
          </Link>
          <nav className="flex gap-5 text-sm">
            <Link href="/legal/terminos" className="text-gray-600 hover:text-primary">
              Terminos
            </Link>
            <Link href="/legal/privacidad" className="text-gray-600 hover:text-primary">
              Privacidad
            </Link>
          </nav>
        </div>
      </header>

      <main className="container mx-auto max-w-3xl px-6 py-12">
        <div className="mb-10 rounded-lg border-l-4 border-amber-500 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">Borrador sin revision legal</p>
          <p className="mt-1 text-sm text-amber-800">
            Este texto es un punto de partida redactado junto con el producto, no un documento
            validado. AUFA almacena fotos de cedula, selfies y fichas medicas, datos alcanzados
            por la Ley 18.331 de Proteccion de Datos Personales. Antes de operar con usuarios
            reales tiene que revisarlo un profesional.
          </p>
        </div>

        <article className="legal-prose">{children}</article>
      </main>

      <footer className="container mx-auto max-w-3xl px-6 pb-16">
        <p className="border-t border-gray-200 pt-6 text-sm text-gray-500">
          AUFA - Nube de Ligas de Uruguay
        </p>
      </footer>
    </div>
  );
}
