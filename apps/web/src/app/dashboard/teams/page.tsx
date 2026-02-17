'use client';

import { useEffect, useState } from 'react';
import { useTenant } from '@/lib/tenant-context';
import { leagueApi } from '@/lib/api';

export default function TeamsPage() {
  const { tenantId } = useTenant();
  const [teams, setTeams] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) return;
    leagueApi.listTeams(tenantId)
      .then(setTeams)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [tenantId]);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Equipos</h1>
        <button className="btn-primary">+ Nuevo Equipo</button>
      </div>

      {isLoading ? (
        <div className="card text-center py-12 text-gray-500">Cargando...</div>
      ) : teams.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500 mb-4">No hay equipos registrados.</p>
          <button className="btn-primary">Registrar primer equipo</button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map((team) => (
            <div key={team.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary font-bold text-lg">
                  {team.name[0]}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{team.name}</h3>
                  <p className="text-sm text-gray-500">{team._count?.teamPlayers || 0} jugadores</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="btn-outline text-sm px-3 py-1.5 flex-1">Ver Plantel</button>
                <button className="btn-primary text-sm px-3 py-1.5 flex-1">Fichar Jugador</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
