'use client';

import { useEffect, useState } from 'react';
import { useTenant } from '@/lib/tenant-context';
import { leagueApi } from '@/lib/api';

export default function TournamentsPage() {
  const { tenantId } = useTenant();
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) return;
    leagueApi.listTournaments(tenantId)
      .then(setTournaments)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [tenantId]);

  const statusLabels: Record<string, { text: string; class: string }> = {
    DRAFT: { text: 'Borrador', class: 'badge-info' },
    REGISTRATION: { text: 'Inscripciones', class: 'badge-warning' },
    IN_PROGRESS: { text: 'En curso', class: 'badge-success' },
    FINISHED: { text: 'Finalizado', class: 'badge bg-gray-100 text-gray-600' },
    CANCELLED: { text: 'Cancelado', class: 'badge-danger' },
  };

  const gameTypeLabels: Record<string, string> = {
    F5: 'Futbol 5',
    F7: 'Futbol 7',
    F11: 'Futbol 11',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Torneos</h1>
        <button className="btn-primary">+ Nuevo Torneo</button>
      </div>

      {isLoading ? (
        <div className="card text-center py-12 text-gray-500">Cargando...</div>
      ) : tournaments.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500 mb-4">No hay torneos creados aun.</p>
          <button className="btn-primary">Crear primer torneo</button>
        </div>
      ) : (
        <div className="grid gap-6">
          {tournaments.map((t) => (
            <div key={t.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-lg font-semibold text-gray-900">{t.name}</h3>
                    <span className={statusLabels[t.status]?.class || 'badge'}>
                      {statusLabels[t.status]?.text || t.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">
                    {gameTypeLabels[t.gameType] || t.gameType} &middot;{' '}
                    {t._count?.tournamentTeams || 0} equipos &middot;{' '}
                    {t._count?.matches || 0} partidos
                  </p>
                </div>
                <div className="flex gap-2">
                  <button className="btn-outline text-sm px-4 py-2">Ver</button>
                  <button className="btn-primary text-sm px-4 py-2">Gestionar</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
