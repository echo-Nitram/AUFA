'use client';

import { useEffect, useState } from 'react';
import { usePublicLeague } from '@/lib/public-league-context';
import { leagueApi, matchApi } from '@/lib/api';

export default function PublicFixturePage() {
  const league = usePublicLeague();
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [selectedTournament, setSelectedTournament] = useState('');
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    leagueApi.listTournaments(league.id).then(data => {
      setTournaments(data);
      if (data.length > 0) setSelectedTournament(data[0].id);
    }).catch(console.error).finally(() => setLoading(false));
  }, [league.id]);

  useEffect(() => {
    if (!selectedTournament) return;
    matchApi.listByTournament(league.id, selectedTournament)
      .then(setMatches)
      .catch(console.error);
  }, [league.id, selectedTournament]);

  const matchdays = matches.reduce((acc: Record<number, any[]>, m) => {
    if (!acc[m.matchday]) acc[m.matchday] = [];
    acc[m.matchday].push(m);
    return acc;
  }, {});

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Cargando fixture...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Fixture</h2>
        {tournaments.length > 1 && (
          <select
            className="input-field w-auto text-sm"
            value={selectedTournament}
            onChange={e => setSelectedTournament(e.target.value)}
          >
            {tournaments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        )}
      </div>

      {Object.keys(matchdays).length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm px-4 py-12 text-center text-gray-400">
          No hay partidos programados
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(matchdays).sort(([a], [b]) => Number(a) - Number(b)).map(([matchday, dayMatches]) => {
            const allPlayed = dayMatches.every((m: any) => m.status !== 'SCHEDULED');
            const allScheduled = dayMatches.every((m: any) => m.status === 'SCHEDULED');
            return (
              <div key={matchday}>
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="text-lg font-bold text-gray-900">Fecha {matchday}</h3>
                  {allPlayed && (
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Finalizada</span>
                  )}
                  {allScheduled && (
                    <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">Programada</span>
                  )}
                </div>
                <div className="bg-white rounded-xl shadow-sm overflow-hidden divide-y divide-gray-50">
                  {dayMatches.map((match: any) => (
                    <div key={match.id} className="px-4 py-3">
                      <div className="flex items-center">
                        <div className="flex-1 text-right">
                          <span className="font-medium text-gray-900 text-sm">{match.homeTeam?.name}</span>
                        </div>
                        <div className="mx-6 min-w-[80px] text-center">
                          {match.status !== 'SCHEDULED' ? (
                            <span className="text-xl font-bold text-gray-900">
                              {match.homeScore} - {match.awayScore}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">
                              {match.scheduledAt
                                ? new Date(match.scheduledAt).toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' })
                                : 'vs'}
                            </span>
                          )}
                        </div>
                        <div className="flex-1">
                          <span className="font-medium text-gray-900 text-sm">{match.awayTeam?.name}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-center gap-4 mt-1 text-xs text-gray-400">
                        {match.venue && <span>{match.venue.name}</span>}
                        {match.scheduledAt && match.status === 'SCHEDULED' && (
                          <span>
                            {new Date(match.scheduledAt).toLocaleDateString('es-UY', {
                              weekday: 'short', day: 'numeric', month: 'short',
                            })}
                          </span>
                        )}
                        {match.referee && <span>Arbitro: {match.referee.fullName}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
