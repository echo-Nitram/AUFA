'use client';

export default function TreasuryPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Smart Treasury</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          { label: 'Total Recaudado', value: '$0', sub: 'UYU', color: 'text-green-600' },
          { label: 'Comision AUFA (4%)', value: '$0', sub: 'UYU', color: 'text-blue-600' },
          { label: 'Pagos Pendientes', value: '0', sub: 'ordenes', color: 'text-amber-600' },
          { label: 'Ingresos Netos', value: '$0', sub: 'UYU', color: 'text-purple-600' },
        ].map((stat, i) => (
          <div key={i} className="card">
            <p className="text-sm text-gray-500 mb-1">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-gray-400">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-3">Generar Ordenes de Pago</h3>
          <p className="text-sm text-gray-500 mb-4">
            Genera ordenes de cobro automaticas para todos los equipos de la proxima fecha.
            Se generan 48 horas antes del partido.
          </p>
          <button className="btn-primary">Generar Ordenes</button>
        </div>

        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-3">Verificar Deudas (Pre-Partido)</h3>
          <p className="text-sm text-gray-500 mb-4">
            Verifica pagos pendientes antes de un partido. Equipos morosos pierden puntos por default.
          </p>
          <button className="btn-accent">Verificar Pagos</button>
        </div>
      </div>

      {/* Payment Orders Table */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">Ordenes de Pago</h3>
        <div className="text-center py-8 text-gray-500">
          <p>No hay ordenes de pago registradas.</p>
          <p className="text-sm text-gray-400 mt-1">Las ordenes se generan automaticamente para cada fecha del torneo.</p>
        </div>
      </div>
    </div>
  );
}
