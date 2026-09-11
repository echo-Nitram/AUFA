'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useTenant } from '@/lib/tenant-context';
import { useAuth } from '@/lib/auth-context';
import { leagueApi, fixtureApi } from '@/lib/api';

export default function TournamentsPage() {
  const { tenantId } = useTenant();
  const { token } = useAuth();
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState<'info' | 'error' | 'success'>('info');
  const [expandedTournament, setExpandedTournament] = useState<string | null>(null);
  const [tournamentDetail, setTournamentDetail] = useState<any>(null);
  const [form, setForm] = useState({
    name: '', gameType: 'F5', pointsForWin: 3, pointsForDraw: 1, pointsForLoss: 0,
    fairPlayBonusPoints: 0, playersPerTeam: 5, minPlayersToStart: 4, maxTeams: 12,
    registrationFee: 0, depositAmount: 0,
    minAge: '' as string | number, maxAge: '' as string | number, gender: '' as string,
    startDate: '', endDate: '',
  });

  function showMsg(text: string, type: 'info' | 'error' | 'success' = 'info') {
    setMsg(text);
    setMsgType(type);
    if (type !== 'error') setTimeout(() => setMsg(''), 4000);
  }

  function loadTournaments() {
    if (!tenantId) return;
    leagueApi.listTournaments(tenantId).then(setTournaments).catch(console.error).finally(() => setIsLoading(false));
  }

  function loadTeams() {
    if (!tenantId) return;
    leagueApi.listTeams(tenantId).then(setTeams).catch(console.error);
  }

  useEffect(() => { loadTournaments(); loadTeams(); }, [tenantId]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!tenantId || !token) return;
    try {
      await leagueApi.createTournament(tenantId, token, {
        name: form.name,
        gameType: form.gameType,
        pointsForWin: form.pointsForWin,
        pointsForDraw: form.pointsForDraw,
        pointsForLoss: form.pointsForLoss,
        fairPlayBonusPoints: form.fairPlayBonusPoints,
        playersPerTeam: form.playersPerTeam,
        minPlayersToStart: form.minPlayersToStart,
        maxTeams: form.maxTeams || null,
        registrationFee: form.registrationFee || null,
        depositAmount: form.depositAmount || null,
        minAge: form.minAge ? Number(form.minAge) : null,
        maxAge: form.maxAge ? Number(form.maxAge) : null,
        gender: form.gender || null,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        tiebreakerOrder: ['GOAL_DIFFERENCE', 'GOALS_FOR', 'FAIR_PLAY'],
        maxSubstitutions: null,
      });
      setShowForm(false);
      showMsg('Torneo creado exitosamente. Ahora inscribi equipos.', 'success');
      loadTournaments();
    } catch (err: any) { showMsg(err.message, 'error'); }
  }

  async function handleExpandTournament(tournamentId: string) {
    if (expandedTournament === tournamentId) { setExpandedTournament(null); return; }
    if (!tenantId) return;
    try {
      const detail = await leagueApi.getTournament(tenantId, tournamentId);
      setTournamentDetail(detail);
      setExpandedTournament(tournamentId);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleRegisterTeam(tournamentId: string, teamId: string) {
    if (!tenantId || !token) return;
    try {
      await leagueApi.registerTeamInTournament(tenantId, token, tournamentId, teamId);
      showMsg('Equipo inscrito exitosamente', 'success');
      // Reload tournament detail and list
      const detail = await leagueApi.getTournament(tenantId, tournamentId);
      setTournamentDetail(detail);
      loadTournaments();
    } catch (err: any) { showMsg(err.message, 'error'); }
  }

  async function handleGenerateFixture(tournamentId: string) {
    if (!tenantId || !token) return;
    try {
      const result = await fixtureApi.generate(tenantId, token, tournamentId);
      const pending = result.unscheduled?.length ?? 0;
      if (pending > 0) {
        const detail = result.unscheduled
          .map((u: any) => `Fecha ${u.matchday}: ${u.homeTeam} vs ${u.awayTeam} (${u.reason})`)
          .join(' · ');
        showMsg(
          `Fixture generado con ${result.totalMatches} partidos, pero ${pending} no se pudieron programar. ${detail}`,
          'error'
        );
      } else {
        showMsg(`Fixture generado: ${result.totalMatches} partidos en ${result.totalMatchdays} fechas`, 'success');
      }
      loadTournaments();
      setExpandedTournament(null);
    } catch (err: any) { showMsg(err.message, 'error'); }
  }

  const gameLabels: Record<string, string> = { F5: 'Futbol 5', F7: 'Futbol 7', F11: 'Futbol 11' };
  const statusLabels: Record<string, { text: string; cls: string }> = {
    DRAFT: { text: 'Borrador', cls: 'badge-info' },
    REGISTRATION: { text: 'Inscripciones', cls: 'badge-warning' },
    IN_PROGRESS: { text: 'En curso', cls: 'badge-success' },
    FINISHED: { text: 'Finalizado', cls: 'badge bg-gray-100 text-gray-600' },
  };

  // Get teams already registered in expanded tournament
  const registeredTeamIds = new Set(
    tournamentDetail?.tournamentTeams?.map((tt: any) => tt.teamId) || []
  );
  const availableTeams = teams.filter(t => !registeredTeamIds.has(t.id));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Torneos</h1>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancelar' : '+ Nuevo Torneo'}
        </button>
      </div>

      {msg && (
        <div className={`mb-4 p-3 rounded-lg text-sm flex items-center justify-between ${
          msgType === 'error' ? 'bg-red-50 text-red-700' :
          msgType === 'success' ? 'bg-green-50 text-green-700' :
          'bg-blue-50 text-blue-700'
        }`}>
          {msg}
          <button className="ml-2 font-bold" onClick={() => setMsg('')}>x</button>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="card mb-6 space-y-4">
          <h3 className="font-semibold text-gray-900">Crear Torneo</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input className="input-field" required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Torneo Apertura 2026" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Juego</label>
              <select className="input-field" value={form.gameType} onChange={e => setForm(p => ({ ...p, gameType: e.target.value }))}>
                <option value="F5">Futbol 5</option><option value="F7">Futbol 7</option><option value="F11">Futbol 11</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pts por ganar</label>
              <input type="number" className="input-field" value={form.pointsForWin} onChange={e => setForm(p => ({ ...p, pointsForWin: +e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pts por empate</label>
              <input type="number" className="input-field" value={form.pointsForDraw} onChange={e => setForm(p => ({ ...p, pointsForDraw: +e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bonus Fair Play</label>
              <input type="number" className="input-field" value={form.fairPlayBonusPoints} onChange={e => setForm(p => ({ ...p, fairPlayBonusPoints: +e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Jugadores por equipo</label>
              <input type="number" className="input-field" value={form.playersPerTeam} onChange={e => setForm(p => ({ ...p, playersPerTeam: +e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min para iniciar</label>
              <input type="number" className="input-field" value={form.minPlayersToStart} onChange={e => setForm(p => ({ ...p, minPlayersToStart: +e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max equipos</label>
              <input type="number" className="input-field" value={form.maxTeams} onChange={e => setForm(p => ({ ...p, maxTeams: +e.target.value }))} />
            </div>
          </div>

          {/* Category & Dates */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Categoria y Fechas</h4>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Edad minima</label>
                <input type="number" min="1" max="99" className="input-field" placeholder="Sin limite"
                  value={form.minAge} onChange={e => setForm(p => ({ ...p, minAge: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Edad maxima</label>
                <input type="number" min="1" max="99" className="input-field" placeholder="Sin limite"
                  value={form.maxAge} onChange={e => setForm(p => ({ ...p, maxAge: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Genero</label>
                <select className="input-field" value={form.gender} onChange={e => setForm(p => ({ ...p, gender: e.target.value }))}>
                  <option value="">Sin restriccion</option>
                  <option value="MALE">Masculino</option>
                  <option value="FEMALE">Femenino</option>
                  <option value="MIXED">Mixto</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Inscripcion ($)</label>
                <input type="number" min="0" className="input-field" placeholder="0"
                  value={form.registrationFee} onChange={e => setForm(p => ({ ...p, registrationFee: +e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha inicio</label>
                <input type="date" className="input-field"
                  value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha fin</label>
                <input type="date" className="input-field"
                  value={form.endDate} onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sena ($)</label>
                <input type="number" min="0" className="input-field" placeholder="0"
                  value={form.depositAmount} onChange={e => setForm(p => ({ ...p, depositAmount: +e.target.value }))} />
              </div>
            </div>
          </div>

          <button type="submit" className="btn-primary">Crear Torneo</button>
        </form>
      )}

      {isLoading ? <div className="card text-center py-12 text-gray-500">Cargando...</div> :
        tournaments.length === 0 ? <div className="card text-center py-12 text-gray-500">No hay torneos. Crea el primero.</div> :
        <div className="space-y-4">
          {tournaments.map(t => {
            const isExpanded = expandedTournament === t.id;
            const canRegister = t.status === 'DRAFT' || t.status === 'REGISTRATION';
            const canGenerate = canRegister && (t._count?.tournamentTeams || 0) >= 2;

            return (
              <div key={t.id} className="card">
                <div className="flex items-center justify-between cursor-pointer" onClick={() => handleExpandTournament(t.id)}>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-semibold">{t.name}</h3>
                      <span className={statusLabels[t.status]?.cls || 'badge'}>{statusLabels[t.status]?.text || t.status}</span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {gameLabels[t.gameType]} &middot; {t._count?.tournamentTeams || 0} equipos &middot; {t._count?.matches || 0} partidos
                      {t.minAge || t.maxAge ? ` · ${t.minAge || '?'}-${t.maxAge || '?'} años` : ''}
                      {t.gender ? ` · ${t.gender === 'MALE' ? 'Masc' : t.gender === 'FEMALE' ? 'Fem' : 'Mixto'}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {canGenerate && (
                      <button
                        className="btn-accent text-sm px-4 py-2"
                        onClick={(e) => { e.stopPropagation(); handleGenerateFixture(t.id); }}
                      >
                        Generar Fixture
                      </button>
                    )}
                    <span className="text-gray-400 text-lg">{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </div>

                {/* Expanded: team registration panel */}
                {isExpanded && tournamentDetail && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    {/* Registered teams */}
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">
                      Equipos inscriptos ({tournamentDetail.tournamentTeams?.length || 0})
                    </h4>

                    {tournamentDetail.tournamentTeams?.length > 0 ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mb-4">
                        {tournamentDetail.tournamentTeams.map((tt: any) => (
                          <div key={tt.id} className="flex items-center gap-2 p-2 bg-green-50 rounded-lg">
                            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center text-green-700 font-bold text-sm">
                              {tt.team.name[0]}
                            </div>
                            <span className="text-sm font-medium text-gray-900 truncate">{tt.team.name}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 mb-4">Ninguno inscrito aun. Agrega equipos abajo.</p>
                    )}

                    {/* Register new teams */}
                    {canRegister && (
                      <>
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">Inscribir equipos</h4>
                        {availableTeams.length > 0 ? (
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mb-4">
                            {availableTeams.map(team => (
                              <button
                                key={team.id}
                                className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg hover:bg-primary/10 hover:border-primary border border-transparent transition-colors text-left"
                                onClick={() => handleRegisterTeam(t.id, team.id)}
                              >
                                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500 font-bold text-sm">
                                  {team.name[0]}
                                </div>
                                <div className="min-w-0">
                                  <span className="text-sm font-medium text-gray-900 truncate block">{team.name}</span>
                                  <span className="text-xs text-gray-400">{team._count?.teamPlayers || 0} jugadores</span>
                                </div>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-400 mb-4">
                            Todos los equipos ya estan inscriptos.
                            {teams.length === 0 && ' Ve a Equipos para crear equipos primero.'}
                          </p>
                        )}

                        {/* Generate fixture info */}
                        {(tournamentDetail.tournamentTeams?.length || 0) >= 2 ? (
                          <div className="bg-green-50 p-3 rounded-lg flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-green-800">
                                Listo para generar fixture con {tournamentDetail.tournamentTeams.length} equipos
                              </p>
                              <p className="text-xs text-green-600">
                                Se creara un round-robin de {tournamentDetail.tournamentTeams.length - 1} fechas
                              </p>
                            </div>
                            <button
                              className="btn-accent text-sm px-4 py-2"
                              onClick={() => handleGenerateFixture(t.id)}
                            >
                              Generar Fixture
                            </button>
                          </div>
                        ) : (
                          <div className="bg-amber-50 p-3 rounded-lg text-sm text-amber-700">
                            Necesitas al menos 2 equipos inscriptos para generar el fixture.
                          </div>
                        )}
                      </>
                    )}

                    {/* If tournament is in progress, show status */}
                    {t.status === 'IN_PROGRESS' && (
                      <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-700">
                        Torneo en curso. Ve a Partidos para cargar resultados.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      }
    </div>
  );
}
