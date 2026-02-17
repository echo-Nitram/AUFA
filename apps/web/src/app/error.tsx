'use client';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <span className="text-red-500 text-2xl font-bold">!</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Algo salio mal</h1>
        <p className="text-gray-500 mb-6 text-sm">
          {error.message || 'Ocurrio un error inesperado. Intenta de nuevo.'}
        </p>
        <div className="flex gap-3 justify-center">
          <button onClick={reset} className="btn-primary">
            Reintentar
          </button>
          <a href="/dashboard" className="btn-outline">
            Ir al dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
