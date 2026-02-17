'use client';

export default function SanctionsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Tribunal de Penas</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        <button className="px-4 py-2 bg-white rounded-md text-sm font-medium shadow-sm">
          Sanciones Activas
        </button>
        <button className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700">
          Pendientes de Tribunal
        </button>
        <button className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700">
          Historial
        </button>
      </div>

      {/* Sanctions Info */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="card border-l-4 border-l-yellow-400">
          <h3 className="font-semibold text-gray-900 mb-2">Sanciones Leves (Automaticas)</h3>
          <p className="text-sm text-gray-500">
            Doble amarilla en un partido = 1 fecha de suspension.
            Se aplica automaticamente al cargar los datos del partido.
          </p>
        </div>
        <div className="card border-l-4 border-l-red-400">
          <h3 className="font-semibold text-gray-900 mb-2">Sanciones Graves (Tribunal)</h3>
          <p className="text-sm text-gray-500">
            Roja directa o agresion. El caso pasa al Tribunal de Penas
            de la liga para dictaminar la sancion correspondiente.
          </p>
        </div>
      </div>

      {/* Sanctions List */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">Sanciones</h3>
        <div className="text-center py-8 text-gray-500">
          <p>No hay sanciones registradas.</p>
          <p className="text-sm text-gray-400 mt-1">
            Las sanciones se generan automaticamente al cargar tarjetas en los partidos.
          </p>
        </div>
      </div>
    </div>
  );
}
