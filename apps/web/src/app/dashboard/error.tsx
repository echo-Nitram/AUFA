'use client';

export default function DashboardError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <span className="text-red-500 text-2xl font-bold">!</span>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Error al cargar</h2>
        <p className="text-gray-500 mb-6 text-sm">
          {error.message || 'Ocurrio un error. Intenta de nuevo.'}
        </p>
        <button onClick={reset} className="btn-primary">
          Reintentar
        </button>
      </div>
    </div>
  );
}
