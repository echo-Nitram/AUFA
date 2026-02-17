'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useTenant } from '@/lib/tenant-context';
import { useAuth } from '@/lib/auth-context';
import { leagueApi, matchApi } from '@/lib/api';

interface Venue {
  id: string;
  name: string;
  address: string | null;
}

interface RosterPlayer {
  playerId: string;
  aufaId: string;
  fullName: string;
  photoUrl: string | null;
  shirtNumber: number | null;
  eligible: boolean;
  reasons: string[];
}

interface MatchRosters {
  matchId: string;
  home: { teamId: string; teamName: string; players: RosterPlayer[] };
  away: { teamId: string; teamName: string; players: RosterPlayer[] };
}

export default function MatchesPage() {
  const { tenantId } = useTenant();
  const { token } = useAuth();
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [selectedTournament, setSelectedTournament] = useState('');
  const [matches, setMatches] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingMatch, setEditingMatch] = useState<any>(null);
  const [rosters, setRosters] = useState<MatchRosters | null>(null);
  const [rostersLoading, setRostersLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState<'success' | 'error'>('success');

  // Venues
  const [venues, setVenues] = useState<Venue[]>([]);
  const [changingVenue, setChangingVenue] = useState<string | null>(null); // matchId being edited

  // Scheduling
  const [schedulingMatch, setSchedulingMatch] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState('');

  // Lineup selection
  const [homeLineup, setHomeLineup] = useState<Set<string>>(new Set());
  const [awayLineup, setAwayLineup] = useState<Set<string>>(new Set());

  // Match data
  const [matchData, setMatchData] = useState({
    homeScore: 0, awayScore: 0, homeFairPlay: 4, awayFairPlay: 4, incidents: '',
  });
  const [goals, setGoals] = useState<any[]>([]);
  const [cards, setCards] = useState<any[]>([]);

  // Temp state for adding goals/cards
  const [newGoal, setNewGoal] = useState({ playerId: '', minute: 1, assistPlayerId: '' });
  const [newCard, setNewCard] = useState({ playerId: '', minute: 1, type: 'YELLOW' as 'YELLOW' | 'RED', reason: '' });

  useEffect(() => {
    if (!tenantId) return;
    leagueApi.listTournaments(tenantId).then(data => {
      setTournaments(data);
      if (data.length > 0) setSelectedTournament(data[0].id);
    }).catch(console.error).finally(() => setIsLoading(false));
    leagueApi.listVenues(tenantId).then(setVenues).catch(console.error);
  }, [tenantId]);

  useEffect(() => {
    if (!tenantId || !selectedTournament) return;
    matchApi.listByTournament(tenantId, selectedTournament).then(setMatches).catch(console.error);
  }, [tenantId, selectedTournament]);

  async function openMatchEntry(match: any) {
    setEditingMatch(match);
    setRosters(null);
    setHomeLineup(new Set());
    setAwayLineup(new Set());
    setGoals([]);
    setCards([]);
    setMatchData({ homeScore: 0, awayScore: 0, homeFairPlay: 4, awayFairPlay: 4, incidents: '' });
    setMsg('');

    if (!tenantId || !token) return;
    setRostersLoading(true);
    try {
      const data = await matchApi.getRosters(tenantId, token, match.id);
      setRosters(data);
    } catch (err: any) {
      setMsg('Error cargando planteles: ' + err.message);
      setMsgType('error');
    } finally {
      setRostersLoading(false);
    }
  }

  function togglePlayer(side: 'home' | 'away', playerId: string) {
    const setter = side === 'home' ? setHomeLineup : setAwayLineup;
    setter(prev => {
      const next = new Set(prev);
      if (next.has(playerId)) next.delete(playerId);
      else next.add(playerId);
      return next;
    });
  }

  function getLineupPlayers(side: 'home' | 'away'): RosterPlayer[] {
    if (!rosters) return [];
    const lineup = side === 'home' ? homeLineup : awayLineup;
    const teamPlayers = side === 'home' ? rosters.home.players : rosters.away.players;
    return teamPlayers.filter(p => lineup.has(p.playerId));
  }

  function getAllLineupPlayers(): (RosterPlayer & { side: 'home' | 'away' })[] {
    return [
      ...getLineupPlayers('home').map(p => ({ ...p, side: 'home' as const })),
      ...getLineupPlayers('away').map(p => ({ ...p, side: 'away' as const })),
    ];
  }

  function findPlayerSide(playerId: string): 'home' | 'away' | null {
    if (homeLineup.has(playerId)) return 'home';
    if (awayLineup.has(playerId)) return 'away';
    return null;
  }

  function addGoal() {
    if (!newGoal.playerId || !rosters) return;
    const allPlayers = getAllLineupPlayers();
    const player = allPlayers.find(p => p.playerId === newGoal.playerId);
    if (!player) return;

    const teamId = player.side === 'home' ? rosters.home.teamId : rosters.away.teamId;
    setGoals(prev => [...prev, {
      playerId: newGoal.playerId,
      teamId,
      minute: newGoal.minute,
      assistPlayerId: newGoal.assistPlayerId || undefined,
      _name: player.fullName,
      _side: player.side,
      _shirt: player.shirtNumber,
    }]);
    setMatchData(p => ({
      ...p,
      homeScore: player.side === 'home' ? p.homeScore + 1 : p.homeScore,
      awayScore: player.side === 'away' ? p.awayScore + 1 : p.awayScore,
    }));
    setNewGoal({ playerId: '', minute: 1, assistPlayerId: '' });
  }

  function removeGoal(idx: number) {
    const g = goals[idx];
    setMatchData(p => ({
      ...p,
      homeScore: g._side === 'home' ? p.homeScore - 1 : p.homeScore,
      awayScore: g._side === 'away' ? p.awayScore - 1 : p.awayScore,
    }));
    setGoals(prev => prev.filter((_, i) => i !== idx));
  }

  function addCard() {
    if (!newCard.playerId || !rosters) return;
    const allPlayers = getAllLineupPlayers();
    const player = allPlayers.find(p => p.playerId === newCard.playerId);
    if (!player) return;

    const teamId = player.side === 'home' ? rosters.home.teamId : rosters.away.teamId;
    setCards(prev => [...prev, {
      playerId: newCard.playerId,
      teamId,
      minute: newCard.minute,
      type: newCard.type,
      reason: newCard.reason,
      _name: player.fullName,
      _shirt: player.shirtNumber,
    }]);
    setNewCard({ playerId: '', minute: 1, type: 'YELLOW', reason: '' });
  }

  async function handleSubmitMatch(e: FormEvent) {
    e.preventDefault();
    if (!tenantId || !token || !editingMatch || !rosters) return;

    if (homeLineup.size === 0 || awayLineup.size === 0) {
      setMsg('Debes seleccionar al menos un jugador por equipo');
      setMsgType('error');
      return;
    }

    setMsg('');
    try {
      await matchApi.enterMatchData(tenantId, token, editingMatch.id, {
        homeScore: matchData.homeScore,
        awayScore: matchData.awayScore,
        homeFairPlay: matchData.homeFairPlay,
        awayFairPlay: matchData.awayFairPlay,
        homeLineup: [...homeLineup],
        awayLineup: [...awayLineup],
        goals: goals.map(g => ({
          playerId: g.playerId, teamId: g.teamId, minute: g.minute,
          ...(g.assistPlayerId && { assistPlayerId: g.assistPlayerId }),
        })),
        cards: cards.map(c => ({
          playerId: c.playerId, teamId: c.teamId, minute: c.minute, type: c.type, reason: c.reason,
        })),
        substitutions: [],
        incidents: matchData.incidents,
      });
      setMsg('Datos cargados exitosamente. Posiciones y sanciones actualizadas.');
      setMsgType('success');
      setEditingMatch(null);
      setRosters(null);
      matchApi.listByTournament(tenantId, selectedTournament).then(setMatches);
    } catch (err: any) {
      setMsg(err.message);
      setMsgType('error');
    }
  }

  async function handleVenueChange(matchId: string, venueId: string) {
    if (!tenantId || !token) return;
    try {
      await matchApi.assignVenue(tenantId, token, matchId, venueId || null);
      setChangingVenue(null);
      // Refresh matches
      matchApi.listByTournament(tenantId, selectedTournament).then(setMatches);
    } catch (err: any) {
      setMsg(err.message);
      setMsgType('error');
    }
  }

  async function handleScheduleMatch(matchId: string, dateValue: string) {
    if (!tenantId || !token) return;
    try {
      await matchApi.schedule(tenantId, token, matchId, dateValue || null);
      setSchedulingMatch(null);
      setScheduleDate('');
      matchApi.listByTournament(tenantId, selectedTournament).then(setMatches);
    } catch (err: any) {
      setMsg(err.message);
      setMsgType('error');
    }
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

      {msg && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${msgType === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {msg}
        </div>
      )}

      {/* ===== MATCH DATA ENTRY ===== */}
      {editingMatch && (
        <div className="card mb-6 border-2 border-primary">
          <h3 className="font-bold text-lg mb-4">
            Cargar Datos: {editingMatch.homeTeam?.name} vs {editingMatch.awayTeam?.name}
          </h3>

          {rostersLoading ? (
            <div className="text-center py-8 text-gray-500">Cargando planteles...</div>
          ) : !rosters ? (
            <div className="text-center py-8 text-red-500">Error al cargar planteles</div>
          ) : (
            <form onSubmit={handleSubmitMatch} className="space-y-6">

              {/* Step 1: Lineup Selection */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">
                  1. Seleccionar Jugadores Presentes
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {(['home', 'away'] as const).map(side => {
                    const team = side === 'home' ? rosters.home : rosters.away;
                    const lineup = side === 'home' ? homeLineup : awayLineup;
                    const ineligible = team.players.filter(p => !p.eligible).length;
                    return (
                      <div key={side}>
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="text-sm font-semibold text-gray-700">{team.teamName}</h5>
                          <span className="text-xs text-gray-400">{lineup.size} / {team.players.length} jugadores</span>
                        </div>
                        {ineligible > 0 && (
                          <p className="text-xs text-red-500 mb-1">{ineligible} jugador(es) inhabilitado(s)</p>
                        )}
                        <div className="space-y-1 max-h-72 overflow-y-auto border rounded-lg p-2 bg-gray-50">
                          {team.players.length === 0 ? (
                            <p className="text-sm text-gray-400 p-2">Sin jugadores registrados</p>
                          ) : team.players.map(player => (
                            <label
                              key={player.playerId}
                              className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors
                                ${!player.eligible
                                  ? 'opacity-60 bg-red-50 cursor-not-allowed'
                                  : lineup.has(player.playerId)
                                    ? 'bg-green-50 ring-1 ring-green-200'
                                    : 'hover:bg-white'}`}
                            >
                              <input
                                type="checkbox"
                                checked={lineup.has(player.playerId)}
                                disabled={!player.eligible}
                                onChange={() => togglePlayer(side, player.playerId)}
                                className="rounded border-gray-300 text-primary focus:ring-primary"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  {player.shirtNumber !== null && (
                                    <span className="text-xs font-bold text-gray-500 bg-white rounded px-1.5 py-0.5 border">
                                      {player.shirtNumber}
                                    </span>
                                  )}
                                  <span className="text-sm font-medium truncate">{player.fullName}</span>
                                </div>
                                {!player.eligible && player.reasons.map((r, i) => (
                                  <span key={i} className="text-xs text-red-600 block mt-0.5">{r}</span>
                                ))}
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Score */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">
                  2. Resultado
                </h4>
                <div className="flex items-center justify-center gap-6">
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-600 mb-1">{rosters.home.teamName}</p>
                    <input type="number" min="0" className="input-field w-20 text-center text-2xl font-bold"
                      value={matchData.homeScore}
                      onChange={e => setMatchData(p => ({ ...p, homeScore: +e.target.value }))} />
                  </div>
                  <span className="text-2xl font-bold text-gray-300">-</span>
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-600 mb-1">{rosters.away.teamName}</p>
                    <input type="number" min="0" className="input-field w-20 text-center text-2xl font-bold"
                      value={matchData.awayScore}
                      onChange={e => setMatchData(p => ({ ...p, awayScore: +e.target.value }))} />
                  </div>
                </div>
              </div>

              {/* Step 3: Goals */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">
                  3. Goles
                </h4>
                {goals.map((g, i) => (
                  <div key={i} className="flex items-center gap-2 mb-1 text-sm bg-green-50 p-2 rounded">
                    {g._shirt !== null && <span className="text-xs font-bold text-gray-400">#{g._shirt}</span>}
                    <span className="font-medium">{g._name}</span>
                    <span className="text-gray-500">
                      ({g._side === 'home' ? rosters.home.teamName : rosters.away.teamName})
                    </span>
                    <span className="text-gray-400">min {g.minute}&apos;</span>
                    <button type="button" className="ml-auto text-red-500 text-xs hover:underline" onClick={() => removeGoal(i)}>
                      Quitar
                    </button>
                  </div>
                ))}
                {(homeLineup.size > 0 || awayLineup.size > 0) ? (
                  <div className="flex items-end gap-2 mt-2">
                    <div className="flex-1">
                      <select className="input-field text-sm" value={newGoal.playerId}
                        onChange={e => setNewGoal(p => ({ ...p, playerId: e.target.value }))}>
                        <option value="">Seleccionar goleador...</option>
                        {homeLineup.size > 0 && (
                          <optgroup label={rosters.home.teamName}>
                            {getLineupPlayers('home').map(p => (
                              <option key={p.playerId} value={p.playerId}>
                                {p.shirtNumber ? `#${p.shirtNumber} ` : ''}{p.fullName}
                              </option>
                            ))}
                          </optgroup>
                        )}
                        {awayLineup.size > 0 && (
                          <optgroup label={rosters.away.teamName}>
                            {getLineupPlayers('away').map(p => (
                              <option key={p.playerId} value={p.playerId}>
                                {p.shirtNumber ? `#${p.shirtNumber} ` : ''}{p.fullName}
                              </option>
                            ))}
                          </optgroup>
                        )}
                      </select>
                    </div>
                    <div className="flex-1">
                      <select className="input-field text-sm" value={newGoal.assistPlayerId}
                        onChange={e => setNewGoal(p => ({ ...p, assistPlayerId: e.target.value }))}>
                        <option value="">Asistencia (opcional)</option>
                        {getAllLineupPlayers().map(p => (
                          <option key={p.playerId} value={p.playerId}>
                            {p.shirtNumber ? `#${p.shirtNumber} ` : ''}{p.fullName}
                          </option>
                        ))}
                      </select>
                    </div>
                    <input type="number" min="1" className="input-field text-sm w-16" placeholder="Min"
                      value={newGoal.minute} onChange={e => setNewGoal(p => ({ ...p, minute: +e.target.value }))} />
                    <button type="button" className="btn-primary text-sm px-3 py-2.5"
                      onClick={addGoal} disabled={!newGoal.playerId}>+</button>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 mt-1">Selecciona jugadores primero para agregar goles</p>
                )}
              </div>

              {/* Step 4: Cards */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">
                  4. Tarjetas
                </h4>
                {cards.map((c, i) => (
                  <div key={i} className={`flex items-center gap-2 mb-1 text-sm p-2 rounded ${c.type === 'RED' ? 'bg-red-50' : 'bg-yellow-50'}`}>
                    <span className={`w-4 h-5 rounded-sm inline-block ${c.type === 'RED' ? 'bg-red-500' : 'bg-yellow-400'}`}></span>
                    {c._shirt !== null && <span className="text-xs font-bold text-gray-400">#{c._shirt}</span>}
                    <span className="font-medium">{c._name}</span>
                    <span className="text-gray-400">min {c.minute}&apos;</span>
                    {c.reason && <span className="text-xs text-gray-500">- {c.reason}</span>}
                    <button type="button" className="ml-auto text-red-500 text-xs hover:underline"
                      onClick={() => setCards(prev => prev.filter((_, idx) => idx !== i))}>
                      Quitar
                    </button>
                  </div>
                ))}
                {(homeLineup.size > 0 || awayLineup.size > 0) ? (
                  <div className="flex items-end gap-2 mt-2">
                    <div className="flex-1">
                      <select className="input-field text-sm" value={newCard.playerId}
                        onChange={e => setNewCard(p => ({ ...p, playerId: e.target.value }))}>
                        <option value="">Seleccionar jugador...</option>
                        {homeLineup.size > 0 && (
                          <optgroup label={rosters.home.teamName}>
                            {getLineupPlayers('home').map(p => (
                              <option key={p.playerId} value={p.playerId}>
                                {p.shirtNumber ? `#${p.shirtNumber} ` : ''}{p.fullName}
                              </option>
                            ))}
                          </optgroup>
                        )}
                        {awayLineup.size > 0 && (
                          <optgroup label={rosters.away.teamName}>
                            {getLineupPlayers('away').map(p => (
                              <option key={p.playerId} value={p.playerId}>
                                {p.shirtNumber ? `#${p.shirtNumber} ` : ''}{p.fullName}
                              </option>
                            ))}
                          </optgroup>
                        )}
                      </select>
                    </div>
                    <select className="input-field text-sm w-28" value={newCard.type}
                      onChange={e => setNewCard(p => ({ ...p, type: e.target.value as any }))}>
                      <option value="YELLOW">Amarilla</option>
                      <option value="RED">Roja</option>
                    </select>
                    <input type="number" min="1" className="input-field text-sm w-16"
                      value={newCard.minute} onChange={e => setNewCard(p => ({ ...p, minute: +e.target.value }))} />
                    <input className="input-field text-sm w-32" placeholder="Motivo"
                      value={newCard.reason} onChange={e => setNewCard(p => ({ ...p, reason: e.target.value }))} />
                    <button type="button" className="btn-accent text-sm px-3 py-2.5"
                      onClick={addCard} disabled={!newCard.playerId}>+</button>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 mt-1">Selecciona jugadores primero para agregar tarjetas</p>
                )}
              </div>

              {/* Step 5: Fair Play */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">
                  5. Fair Play (Arbitro)
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">{rosters.home.teamName} (1-5)</label>
                    <input type="number" min="1" max="5" step="0.5" className="input-field"
                      value={matchData.homeFairPlay}
                      onChange={e => setMatchData(p => ({ ...p, homeFairPlay: +e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">{rosters.away.teamName} (1-5)</label>
                    <input type="number" min="1" max="5" step="0.5" className="input-field"
                      value={matchData.awayFairPlay}
                      onChange={e => setMatchData(p => ({ ...p, awayFairPlay: +e.target.value }))} />
                  </div>
                </div>
              </div>

              {/* Step 6: Incidents */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">
                  6. Incidentes / Notas
                </h4>
                <textarea className="input-field" rows={2} value={matchData.incidents}
                  placeholder="Cualquier observacion relevante del partido..."
                  onChange={e => setMatchData(p => ({ ...p, incidents: e.target.value }))} />
              </div>

              {/* Submit */}
              <div className="flex gap-3 pt-4 border-t">
                <button type="submit" className="btn-primary">
                  Guardar y Actualizar Posiciones
                </button>
                <button type="button" className="btn-outline" onClick={() => { setEditingMatch(null); setRosters(null); }}>
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ===== MATCH LIST ===== */}
      {isLoading ? (
        <div className="card text-center py-12 text-gray-500">Cargando...</div>
      ) : Object.keys(matchdays).length === 0 ? (
        <div className="card text-center py-12 text-gray-500">
          No hay partidos. Genera el fixture desde Torneos.
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(matchdays).sort(([a], [b]) => Number(a) - Number(b)).map(([matchday, dayMatches]) => (
            <div key={matchday}>
              <h2 className="text-lg font-semibold text-gray-700 mb-3">Fecha {matchday}</h2>
              <div className="space-y-3">
                {dayMatches.map((match: any) => (
                  <div key={match.id} className="card">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-6 flex-1">
                        <div className="text-right flex-1">
                          <span className="font-medium">{match.homeTeam?.name}</span>
                        </div>
                        <div className="flex items-center gap-2 min-w-[80px] justify-center">
                          {match.status !== 'SCHEDULED' ? (
                            <span className="text-2xl font-bold">{match.homeScore} - {match.awayScore}</span>
                          ) : (
                            <span className="text-sm text-gray-400">
                              {match.scheduledAt
                                ? new Date(match.scheduledAt).toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' })
                                : 'vs'}
                            </span>
                          )}
                        </div>
                        <div className="flex-1">
                          <span className="font-medium">{match.awayTeam?.name}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 ml-4">
                        <span className={statusLabels[match.status]?.cls || 'badge'}>
                          {statusLabels[match.status]?.text || match.status}
                        </span>
                        {match.status === 'SCHEDULED' && (
                          <button className="btn-primary text-sm px-3 py-1.5" onClick={() => openMatchEntry(match)}>
                            Cargar Datos
                          </button>
                        )}
                      </div>
                    </div>
                    {/* Venue + Schedule row */}
                    <div className="mt-2 flex items-center gap-4 flex-wrap">
                      {/* Venue assignment */}
                      <div className="flex items-center gap-2">
                        {changingVenue === match.id ? (
                          <>
                            <select
                              className="input-field text-xs py-1 w-48"
                              defaultValue={match.venue?.id || ''}
                              onChange={e => handleVenueChange(match.id, e.target.value)}
                              autoFocus
                            >
                              <option value="">Sin cancha</option>
                              {venues.map(v => (
                                <option key={v.id} value={v.id}>{v.name}</option>
                              ))}
                            </select>
                            <button className="text-xs text-gray-400 hover:text-gray-600"
                              onClick={() => setChangingVenue(null)}>Cancelar</button>
                          </>
                        ) : (
                          <button
                            className="text-xs text-gray-400 hover:text-primary transition-colors flex items-center gap-1"
                            onClick={() => setChangingVenue(match.id)}
                          >
                            {match.venue
                              ? <><span>{match.venue.name}</span><span className="text-gray-300">| Cambiar</span></>
                              : <span className="text-amber-500">+ Asignar cancha</span>
                            }
                          </button>
                        )}
                      </div>

                      {/* Schedule assignment */}
                      <div className="flex items-center gap-2">
                        {schedulingMatch === match.id ? (
                          <>
                            <input
                              type="datetime-local"
                              className="input-field text-xs py-1 w-48"
                              defaultValue={match.scheduledAt ? new Date(match.scheduledAt).toISOString().slice(0, 16) : ''}
                              onChange={e => setScheduleDate(e.target.value)}
                              autoFocus
                            />
                            <button
                              className="text-xs text-primary font-medium hover:underline"
                              onClick={() => handleScheduleMatch(match.id, scheduleDate)}
                            >
                              Guardar
                            </button>
                            <button className="text-xs text-gray-400 hover:text-gray-600"
                              onClick={() => { setSchedulingMatch(null); setScheduleDate(''); }}>
                              Cancelar
                            </button>
                          </>
                        ) : (
                          <button
                            className="text-xs text-gray-400 hover:text-primary transition-colors flex items-center gap-1"
                            onClick={() => { setSchedulingMatch(match.id); setScheduleDate(match.scheduledAt || ''); }}
                          >
                            {match.scheduledAt
                              ? <>
                                  <span>{new Date(match.scheduledAt).toLocaleString('es-UY', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                  <span className="text-gray-300">| Cambiar</span>
                                </>
                              : <span className="text-amber-500">+ Programar horario</span>
                            }
                          </button>
                        )}
                      </div>

                      {/* Referee info */}
                      {match.referee && (
                        <span className="text-xs text-gray-400">
                          Arbitro: {match.referee.fullName}
                        </span>
                      )}
                    </div>
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
