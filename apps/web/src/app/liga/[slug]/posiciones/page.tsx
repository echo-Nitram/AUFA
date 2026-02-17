'use client';

import { useEffect, useState } from 'react';
import { usePublicLeague } from '@/lib/public-league-context';
import { leagueApi } from '@/lib/api';

export default function PublicStandingsPage() {
  const league = usePublicLeague();
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [selectedTournament, setSelectedTournament] = useState('');
  const [standings, setStandings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    leagueApi.listTournaments(league.id).then(data => {
      setTournaments(data);
      if (data.length > 0) setSelectedTournament(data[0].id);
    }).catch(console.error).finally(() => setLoading(false));
  }, [league.id]);

  useEffect(() => {
    if (!selectedTournament) return;
    leagueApi.getStandings(league.id, selectedTournament)
      .then(setStandings)
      .catch(console.error);
  }, [league.id, selectedTournament]);

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Cargando posiciones...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Tabla de Posiciones</h2>
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

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
                <th className="px-4 py-3 text-left w-10">#</th>
                <th className="px-4 py-3 text-left">Equipo</th>
                <th className="px-4 py-3 text-center">PJ</th>
                <th className="px-4 py-3 text-center">G</th>
                <th className="px-4 py-3 text-center">E</th>
                <th className="px-4 py-3 text-center">P</th>
                <th className="px-4 py-3 text-center">GF</th>
                <th className="px-4 py-3 text-center">GC</th>
                <th className="px-4 py-3 text-center">DG</th>
                <th className="px-4 py-3 text-center font-bold">Pts</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((team: any, i: number) => {
                const dg = team.goalsFor - team.goalsAgainst;
                return (
                  <tr key={team.teamId} className={`border-t border-gray-100 hover:bg-gray-50 transition-colors ${i < 2 ? 'bg-green-50/30' : ''}`}>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                        i === 0 ? 'bg-yellow-100 text-yellow-700' :
                        i === 1 ? 'bg-gray-100 text-gray-600' :
                        'text-gray-400'
                      }`}>
                        {i + 1}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{team.team?.name}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{team.played}</td>
                    <td className="px-4 py-3 text-center text-green-600 font-medium">{team.won}</td>
                    <td className="px-4 py-3 text-center text-gray-500">{team.drawn}</td>
                    <td className="px-4 py-3 text-center text-red-500">{team.lost}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{team.goalsFor}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{team.goalsAgainst}</td>
                    <td className={`px-4 py-3 text-center font-medium ${dg > 0 ? 'text-green-600' : dg < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                      {dg > 0 ? `+${dg}` : dg}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary font-bold">
                        {team.points}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {standings.length === 0 && (
          <p className="px-4 py-12 text-center text-gray-400">No hay datos de posiciones</p>
        )}
      </div>
    </div>
  );
}
