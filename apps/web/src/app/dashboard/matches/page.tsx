'use client';

import { useEffect, useState } from 'react';
import { useTenant } from '@/lib/tenant-context';
import { leagueApi, matchApi } from '@/lib/api';

export default function MatchesPage() {
  const { tenantId } = useTenant();
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [selectedTournament, setSelectedTournament] = useState('');
  const [matches, setMatches] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) return;
    leagueApi.listTournaments(tenantId)
      .then((data) => {
        setTournaments(data);
        if (data.length > 0) setSelectedTournament(data[0].id);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [tenantId]);

  useEffect(() => {
    if (!tenantId || !selectedTournament) return;
    matchApi.listByTournament(tenantId, selectedTournament)
      .then(setMatches)
      .catch(console.error);
  }, [tenantId, selectedTournament]);

  const statusLabels: Record<string, { text: string; class: string }> = {
    SCHEDULED: { text: 'Programado', class: 'badge-info' },
    IN_PROGRESS: { text: 'En juego', class: 'badge-success' },
    COMPLETED: { text: 'Finalizado', class: 'badge bg-gray-100 text-gray-600' },
    SUSPENDED: { text: 'Suspendido', class: 'badge-warning' },
    DEFAULT_HOME: { text: 'Default Local', class: 'badge-danger' },
    DEFAULT_AWAY: { text: 'Default Visitante', class: 'badge-danger' },
  };

  // Group matches by matchday
  const matchdays = matches.reduce((acc: Record<number, any[]>, m) => {
    if (!acc[m.matchday]) acc[m.matchday] = [];
    acc[m.matchday].push(m);
    return acc;
  }, {});

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Partidos</h1>
        {tournaments.length > 0 && (
          <select
            className="input-field w-auto"
            value={selectedTournament}
            onChange={(e) => setSelectedTournament(e.target.value)}
          >
            {tournaments.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        )}
      </div>

      {isLoading ? (
        <div className="card text-center py-12 text-gray-500">Cargando...</div>
      ) : Object.keys(matchdays).length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500 mb-2">No hay partidos generados.</p>
          <p className="text-sm text-gray-400">Genera el fixture desde la seccion de Torneos.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(matchdays)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([matchday, dayMatches]) => (
              <div key={matchday}>
                <h2 className="text-lg font-semibold text-gray-700 mb-4">Fecha {matchday}</h2>
                <div className="space-y-3">
                  {dayMatches.map((match: any) => (
                    <div key={match.id} className="card">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6 flex-1">
                          {/* Home */}
                          <div className="text-right flex-1">
                            <span className="font-medium">{match.homeTeam?.name}</span>
                          </div>

                          {/* Score */}
                          <div className="flex items-center gap-2 min-w-[80px] justify-center">
                            {match.status === 'COMPLETED' || match.status === 'DEFAULT_HOME' || match.status === 'DEFAULT_AWAY' ? (
                              <span className="text-2xl font-bold">
                                {match.homeScore} - {match.awayScore}
                              </span>
                            ) : (
                              <span className="text-sm text-gray-400">
                                {match.scheduledAt
                                  ? new Date(match.scheduledAt).toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' })
                                  : 'vs'}
                              </span>
                            )}
                          </div>

                          {/* Away */}
                          <div className="flex-1">
                            <span className="font-medium">{match.awayTeam?.name}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 ml-4">
                          <span className={statusLabels[match.status]?.class || 'badge'}>
                            {statusLabels[match.status]?.text || match.status}
                          </span>
                          {match.status === 'SCHEDULED' && (
                            <button className="btn-primary text-sm px-3 py-1.5">Cargar Datos</button>
                          )}
                        </div>
                      </div>

                      {match.venue && (
                        <p className="text-xs text-gray-400 mt-2">
                          {match.venue.name}
                          {match.scheduledAt && ` - ${new Date(match.scheduledAt).toLocaleDateString('es-UY')}`}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
