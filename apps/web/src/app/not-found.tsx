import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center px-4">
      <div className="text-center">
        <div className="w-20 h-20 bg-accent rounded-2xl flex items-center justify-center font-bold text-white text-4xl mx-auto mb-6">
          ?
        </div>
        <h1 className="text-6xl font-bold text-white mb-4">404</h1>
        <p className="text-xl text-blue-200 mb-8">Pagina no encontrada</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/" className="btn-accent px-6 py-2.5">
            Ir al inicio
          </Link>
          <Link href="/dashboard" className="btn-outline border-white text-white hover:bg-white hover:text-blue-900 px-6 py-2.5">
            Ir al dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
