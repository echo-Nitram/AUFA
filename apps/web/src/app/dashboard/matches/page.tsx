'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useTenant } from '@/lib/tenant-context';
import { useAuth } from '@/lib/auth-context';
import { leagueApi, matchApi } from '@/lib/api';

export default function MatchesPage() {
  const { tenantId } = useTenant();
  const { token } = useAuth();
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [selectedTournament, setSelectedTournament] = useState('');
  const [matches, setMatches] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingMatch, setEditingMatch] = useState<any>(null);
  const [msg, setMsg] = useState('');

  // Match data entry form state
  const [matchData, setMatchData] = useState({
    homeScore: 0, awayScore: 0, homeFairPlay: 4, awayFairPlay: 4,
    homeLineup: [] as string[], awayLineup: [] as string[],
    goals: [] as any[], cards: [] as any[], substitutions: [] as any[], incidents: '',
  });

  // Temp state for adding goals/cards
  const [newGoal, setNewGoal] = useState({ playerName: '', teamSide: 'home', minute: 1 });
  const [newCard, setNewCard] = useState({ playerName: '', teamSide: 'home', minute: 1, type: 'YELLOW' as 'YELLOW' | 'RED', reason: '' });

  useEffect(() => {
    if (!tenantId) return;
    leagueApi.listTournaments(tenantId).then(data => {
      setTournaments(data);
      if (data.length > 0) setSelectedTournament(data[0].id);
    }).catch(console.error).finally(() => setIsLoading(false));
  }, [tenantId]);

  useEffect(() => {
    if (!tenantId || !selectedTournament) return;
    matchApi.listByTournament(tenantId, selectedTournament).then(setMatches).catch(console.error);
  }, [tenantId, selectedTournament]);

  function openMatchEntry(match: any) {
    setEditingMatch(match);
    setMatchData({
      homeScore: 0, awayScore: 0, homeFairPlay: 4, awayFairPlay: 4,
      homeLineup: [], awayLineup: [], goals: [], cards: [], substitutions: [], incidents: '',
    });
    setMsg('');
  }

  function addGoal() {
    const teamId = newGoal.teamSide === 'home' ? editingMatch.homeTeamId : editingMatch.awayTeamId;
    setMatchData(p => ({
      ...p,
      goals: [...p.goals, { playerId: `temp_${Date.now()}`, teamId, minute: newGoal.minute, _name: newGoal.playerName, _side: newGoal.teamSide }],
      homeScore: newGoal.teamSide === 'home' ? p.homeScore + 1 : p.homeScore,
      awayScore: newGoal.teamSide === 'away' ? p.awayScore + 1 : p.awayScore,
    }));
    setNewGoal({ playerName: '', teamSide: 'home', minute: 1 });
  }

  function removeGoal(idx: number) {
    const g = matchData.goals[idx];
    setMatchData(p => ({
      ...p,
      goals: p.goals.filter((_, i) => i !== idx),
      homeScore: g._side === 'home' ? p.homeScore - 1 : p.homeScore,
      awayScore: g._side === 'away' ? p.awayScore - 1 : p.awayScore,
    }));
  }

  function addCard() {
    const teamId = newCard.teamSide === 'home' ? editingMatch.homeTeamId : editingMatch.awayTeamId;
    setMatchData(p => ({
      ...p,
      cards: [...p.cards, { playerId: `temp_${Date.now()}`, teamId, minute: newCard.minute, type: newCard.type, reason: newCard.reason, _name: newCard.playerName }],
    }));
    setNewCard({ playerName: '', teamSide: 'home', minute: 1, type: 'YELLOW', reason: '' });
  }

  async function handleSubmitMatch(e: FormEvent) {
    e.preventDefault();
    if (!tenantId || !token || !editingMatch) return;
    try {
      // For the MVP, we send the data with temp playerIds - in production these would be real IDs from lineup selection
      await matchApi.enterMatchData(tenantId, token, editingMatch.id, {
        homeScore: matchData.homeScore,
        awayScore: matchData.awayScore,
        homeFairPlay: matchData.homeFairPlay,
        awayFairPlay: matchData.awayFairPlay,
        homeLineup: matchData.homeLineup,
        awayLineup: matchData.awayLineup,
        goals: matchData.goals.map(g => ({ playerId: g.playerId, teamId: g.teamId, minute: g.minute })),
        cards: matchData.cards.map(c => ({ playerId: c.playerId, teamId: c.teamId, minute: c.minute, type: c.type, reason: c.reason })),
        substitutions: [],
        incidents: matchData.incidents,
      });
      setMsg('Datos cargados exitosamente. Posiciones actualizadas.');
      setEditingMatch(null);
      matchApi.listByTournament(tenantId, selectedTournament).then(setMatches);
    } catch (err: any) { setMsg(err.message); }
  }

  const statusLabels: Record<string, { text: string; cls: string }> = {
    SCHEDULED: { text: 'Programado', cls: 'badge-info' },
    COMPLETED: { text: 'Finalizado', cls: 'badge bg-gray-100 text-gray-600' },
    DEFAULT_HOME: { text: 'Default Local', cls: 'badge-danger' },
    DEFAULT_AWAY: { text: 'Default Visitante', cls: 'badge-danger' },
  };

  const matchdays = matches.reduce((acc: Record<number, any[]>, m) => {
    if (!acc[m.matchday]) acc[m.matchday] = [];
    acc[m.matchday].push(m);
    return acc;
  }, {});

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Partidos</h1>
        {tournaments.length > 0 && (
          <select className="input-field w-auto" value={selectedTournament} onChange={e => setSelectedTournament(e.target.value)}>
            {tournaments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        )}
      </div>

      {msg && <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm">{msg}</div>}

      {/* Match Data Entry Modal */}
      {editingMatch && (
        <div className="card mb-6 border-2 border-primary">
          <h3 className="font-bold text-lg mb-4">Cargar Datos: {editingMatch.homeTeam?.name} vs {editingMatch.awayTeam?.name}</h3>
          <form onSubmit={handleSubmitMatch} className="space-y-6">
            {/* Score */}
            <div className="flex items-center justify-center gap-6">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600 mb-1">{editingMatch.homeTeam?.name}</p>
                <input type="number" min="0" className="input-field w-20 text-center text-2xl font-bold" value={matchData.homeScore}
                  onChange={e => setMatchData(p => ({ ...p, homeScore: +e.target.value }))} />
              </div>
              <span className="text-2xl font-bold text-gray-300">-</span>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600 mb-1">{editingMatch.awayTeam?.name}</p>
                <input type="number" min="0" className="input-field w-20 text-center text-2xl font-bold" value={matchData.awayScore}
                  onChange={e => setMatchData(p => ({ ...p, awayScore: +e.target.value }))} />
              </div>
            </div>

            {/* Fair Play */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Fair Play {editingMatch.homeTeam?.name} (1-5)</label>
                <input type="number" min="1" max="5" step="0.5" className="input-field" value={matchData.homeFairPlay}
                  onChange={e => setMatchData(p => ({ ...p, homeFairPlay: +e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Fair Play {editingMatch.awayTeam?.name} (1-5)</label>
                <input type="number" min="1" max="5" step="0.5" className="input-field" value={matchData.awayFairPlay}
                  onChange={e => setMatchData(p => ({ ...p, awayFairPlay: +e.target.value }))} />
              </div>
            </div>

            {/* Goals */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Goles</h4>
              {matchData.goals.map((g, i) => (
                <div key={i} className="flex items-center gap-2 mb-1 text-sm bg-green-50 p-2 rounded">
                  <span className="font-medium">{g._name || 'Jugador'}</span>
                  <span className="text-gray-500">({g._side === 'home' ? editingMatch.homeTeam?.name : editingMatch.awayTeam?.name})</span>
                  <span className="text-gray-400">min {g.minute}'</span>
                  <button type="button" className="ml-auto text-red-500 text-xs" onClick={() => removeGoal(i)}>Quitar</button>
                </div>
              ))}
              <div className="flex items-end gap-2 mt-2">
                <input className="input-field text-sm flex-1" placeholder="Nombre jugador" value={newGoal.playerName} onChange={e => setNewGoal(p => ({ ...p, playerName: e.target.value }))} />
                <select className="input-field text-sm w-28" value={newGoal.teamSide} onChange={e => setNewGoal(p => ({ ...p, teamSide: e.target.value }))}>
                  <option value="home">{editingMatch.homeTeam?.name}</option>
                  <option value="away">{editingMatch.awayTeam?.name}</option>
                </select>
                <input type="number" min="1" className="input-field text-sm w-16" placeholder="Min" value={newGoal.minute} onChange={e => setNewGoal(p => ({ ...p, minute: +e.target.value }))} />
                <button type="button" className="btn-primary text-sm px-3 py-2.5" onClick={addGoal}>+</button>
              </div>
            </div>

            {/* Cards */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Tarjetas</h4>
              {matchData.cards.map((c, i) => (
                <div key={i} className={`flex items-center gap-2 mb-1 text-sm p-2 rounded ${c.type === 'RED' ? 'bg-red-50' : 'bg-yellow-50'}`}>
                  <span className={`w-4 h-5 rounded-sm ${c.type === 'RED' ? 'bg-red-500' : 'bg-yellow-400'}`}></span>
                  <span className="font-medium">{c._name || 'Jugador'}</span>
                  <span className="text-gray-400">min {c.minute}'</span>
                  {c.reason && <span className="text-xs text-gray-500">- {c.reason}</span>}
                </div>
              ))}
              <div className="flex items-end gap-2 mt-2">
                <input className="input-field text-sm flex-1" placeholder="Nombre jugador" value={newCard.playerName} onChange={e => setNewCard(p => ({ ...p, playerName: e.target.value }))} />
                <select className="input-field text-sm w-28" value={newCard.teamSide} onChange={e => setNewCard(p => ({ ...p, teamSide: e.target.value }))}>
                  <option value="home">{editingMatch.homeTeam?.name}</option>
                  <option value="away">{editingMatch.awayTeam?.name}</option>
                </select>
                <select className="input-field text-sm w-24" value={newCard.type} onChange={e => setNewCard(p => ({ ...p, type: e.target.value as any }))}>
                  <option value="YELLOW">Amarilla</option><option value="RED">Roja</option>
                </select>
                <input type="number" min="1" className="input-field text-sm w-16" value={newCard.minute} onChange={e => setNewCard(p => ({ ...p, minute: +e.target.value }))} />
                <button type="button" className="btn-accent text-sm px-3 py-2.5" onClick={addCard}>+</button>
              </div>
            </div>

            {/* Incidents */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Incidentes / Notas</label>
              <textarea className="input-field" rows={2} value={matchData.incidents} onChange={e => setMatchData(p => ({ ...p, incidents: e.target.value }))} />
            </div>

            <div className="flex gap-3">
              <button type="submit" className="btn-primary">Guardar y Actualizar Posiciones</button>
              <button type="button" className="btn-outline" onClick={() => setEditingMatch(null)}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {/* Match List */}
      {isLoading ? <div className="card text-center py-12 text-gray-500">Cargando...</div> :
        Object.keys(matchdays).length === 0 ? <div className="card text-center py-12 text-gray-500">No hay partidos. Genera el fixture desde Torneos.</div> :
        <div className="space-y-8">
          {Object.entries(matchdays).sort(([a], [b]) => Number(a) - Number(b)).map(([matchday, dayMatches]) => (
            <div key={matchday}>
              <h2 className="text-lg font-semibold text-gray-700 mb-3">Fecha {matchday}</h2>
              <div className="space-y-3">
                {dayMatches.map((match: any) => (
                  <div key={match.id} className="card">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-6 flex-1">
                        <div className="text-right flex-1"><span className="font-medium">{match.homeTeam?.name}</span></div>
                        <div className="flex items-center gap-2 min-w-[80px] justify-center">
                          {match.status !== 'SCHEDULED' ? (
                            <span className="text-2xl font-bold">{match.homeScore} - {match.awayScore}</span>
                          ) : (
                            <span className="text-sm text-gray-400">
                              {match.scheduledAt ? new Date(match.scheduledAt).toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' }) : 'vs'}
                            </span>
                          )}
                        </div>
                        <div className="flex-1"><span className="font-medium">{match.awayTeam?.name}</span></div>
                      </div>
                      <div className="flex items-center gap-3 ml-4">
                        <span className={statusLabels[match.status]?.cls || 'badge'}>{statusLabels[match.status]?.text || match.status}</span>
                        {match.status === 'SCHEDULED' && (
                          <button className="btn-primary text-sm px-3 py-1.5" onClick={() => openMatchEntry(match)}>Cargar Datos</button>
                        )}
                      </div>
                    </div>
                    {match.venue && <p className="text-xs text-gray-400 mt-2">{match.venue.name}</p>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      }
    </div>
  );
}
