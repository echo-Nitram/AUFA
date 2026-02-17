'use client';

import { useEffect, useState } from 'react';
import { usePublicLeague } from '@/lib/public-league-context';
import { leagueApi, statsApi } from '@/lib/api';

export default function PublicScorersPage() {
  const league = usePublicLeague();
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [selectedTournament, setSelectedTournament] = useState('');
  const [scorers, setScorers] = useState<any[]>([]);
  const [cards, setCards] = useState<any[]>([]);
  const [tab, setTab] = useState<'scorers' | 'cards'>('scorers');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    leagueApi.listTournaments(league.id).then(data => {
      setTournaments(data);
      if (data.length > 0) setSelectedTournament(data[0].id);
    }).catch(console.error).finally(() => setLoading(false));
  }, [league.id]);

  useEffect(() => {
    if (!selectedTournament) return;
    Promise.all([
      statsApi.topScorers(league.id, selectedTournament).then(setScorers),
      statsApi.cardsLeaders(league.id, selectedTournament).then(setCards),
    ]).catch(console.error);
  }, [league.id, selectedTournament]);

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Cargando estadisticas...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Estadisticas</h2>
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

      {/* Tab toggle */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6 w-fit">
        <button
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            tab === 'scorers' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setTab('scorers')}
        >
          Goleadores
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            tab === 'cards' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setTab('cards')}
        >
          Tarjetas
        </button>
      </div>

      {/* Scorers table */}
      {tab === 'scorers' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
                <th className="px-4 py-3 text-left w-10">#</th>
                <th className="px-4 py-3 text-left">Jugador</th>
                <th className="px-4 py-3 text-left">Equipo</th>
                <th className="px-4 py-3 text-center">Goles</th>
              </tr>
            </thead>
            <tbody>
              {scorers.map((s: any) => (
                <tr key={s.playerId} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                      s.position === 1 ? 'bg-yellow-100 text-yellow-700' :
                      s.position === 2 ? 'bg-gray-100 text-gray-600' :
                      s.position === 3 ? 'bg-amber-50 text-amber-600' :
                      'text-gray-400'
                    }`}>
                      {s.position}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">{s.playerName}</td>
                  <td className="px-4 py-3 text-gray-500">{s.teamName}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-green-50 text-green-700 font-bold">
                      {s.goals}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {scorers.length === 0 && (
            <p className="px-4 py-12 text-center text-gray-400">No hay goles registrados</p>
          )}
        </div>
      )}

      {/* Cards table */}
      {tab === 'cards' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
                <th className="px-4 py-3 text-left w-10">#</th>
                <th className="px-4 py-3 text-left">Jugador</th>
                <th className="px-4 py-3 text-left">Equipo</th>
                <th className="px-4 py-3 text-center">Amarillas</th>
                <th className="px-4 py-3 text-center">Rojas</th>
              </tr>
            </thead>
            <tbody>
              {cards.map((c: any) => (
                <tr key={c.playerId} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-bold text-gray-400">{c.position}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{c.playerName}</td>
                  <td className="px-4 py-3 text-gray-500">{c.teamName}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-3 h-4 rounded-sm bg-yellow-400 inline-block"></span>
                      <span className="font-medium">{c.yellowCards}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-3 h-4 rounded-sm bg-red-500 inline-block"></span>
                      <span className="font-medium">{c.redCards}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {cards.length === 0 && (
            <p className="px-4 py-12 text-center text-gray-400">No hay tarjetas registradas</p>
          )}
        </div>
      )}
    </div>
  );
}
