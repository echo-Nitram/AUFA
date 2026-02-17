'use client';

import { useEffect, useState } from 'react';
import { useTenant } from '@/lib/tenant-context';
import { leagueApi } from '@/lib/api';

interface StandingsRow {
  position: number;
  teamId: string;
  teamName: string;
  teamLogoUrl?: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  fairPlayScore: number;
}

export default function StandingsPage() {
  const { tenantId } = useTenant();
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<string>('');
  const [standings, setStandings] = useState<StandingsRow[]>([]);
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
    leagueApi.getStandings(tenantId, selectedTournament)
      .then(setStandings)
      .catch(console.error);
  }, [tenantId, selectedTournament]);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Tabla de Posiciones</h1>
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
      ) : standings.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500">No hay datos de posiciones aun.</p>
          <p className="text-sm text-gray-400 mt-2">Los datos se actualizan automaticamente al cargar resultados.</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="standings-table">
            <thead>
              <tr>
                <th className="w-12">#</th>
                <th>Equipo</th>
                <th className="text-center">PJ</th>
                <th className="text-center">G</th>
                <th className="text-center">E</th>
                <th className="text-center">P</th>
                <th className="text-center">GF</th>
                <th className="text-center">GC</th>
                <th className="text-center">DIF</th>
                <th className="text-center">FP</th>
                <th className="text-center font-bold">PTS</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((row) => (
                <tr key={row.teamId}>
                  <td className="font-bold text-gray-400">{row.position}</td>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold text-gray-500">
                        {row.teamName[0]}
                      </div>
                      <span className="font-medium">{row.teamName}</span>
                    </div>
                  </td>
                  <td className="text-center">{row.played}</td>
                  <td className="text-center text-green-600">{row.won}</td>
                  <td className="text-center text-yellow-600">{row.drawn}</td>
                  <td className="text-center text-red-600">{row.lost}</td>
                  <td className="text-center">{row.goalsFor}</td>
                  <td className="text-center">{row.goalsAgainst}</td>
                  <td className="text-center font-medium">
                    {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                  </td>
                  <td className="text-center">{row.fairPlayScore.toFixed(1)}</td>
                  <td className="text-center font-bold text-lg">{row.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
