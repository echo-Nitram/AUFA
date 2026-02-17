'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useTenant } from '@/lib/tenant-context';
import { useAuth } from '@/lib/auth-context';
import { leagueApi, fixtureApi } from '@/lib/api';

export default function TournamentsPage() {
  const { tenantId } = useTenant();
  const { token } = useAuth();
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({
    name: '', gameType: 'F5', pointsForWin: 3, pointsForDraw: 1, pointsForLoss: 0,
    fairPlayBonusPoints: 0, playersPerTeam: 5, minPlayersToStart: 4, maxTeams: 12,
    registrationFee: 0, depositAmount: 0,
  });

  function loadTournaments() {
    if (!tenantId) return;
    leagueApi.listTournaments(tenantId).then(setTournaments).catch(console.error).finally(() => setIsLoading(false));
  }

  useEffect(() => { loadTournaments(); }, [tenantId]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!tenantId || !token) return;
    try {
      await leagueApi.createTournament(tenantId, token, {
        ...form,
        tiebreakerOrder: ['GOAL_DIFFERENCE', 'GOALS_FOR', 'FAIR_PLAY'],
        maxSubstitutions: null,
      });
      setShowForm(false);
      setMsg('Torneo creado exitosamente');
      loadTournaments();
    } catch (err: any) { setMsg(err.message); }
  }

  async function handleGenerateFixture(tournamentId: string) {
    if (!tenantId || !token) return;
    try {
      const result = await fixtureApi.generate(tenantId, token, tournamentId);
      setMsg(result.message);
      loadTournaments();
    } catch (err: any) { setMsg(err.message); }
  }

  const gameLabels: Record<string, string> = { F5: 'Futbol 5', F7: 'Futbol 7', F11: 'Futbol 11' };
  const statusLabels: Record<string, { text: string; cls: string }> = {
    DRAFT: { text: 'Borrador', cls: 'badge-info' }, REGISTRATION: { text: 'Inscripciones', cls: 'badge-warning' },
    IN_PROGRESS: { text: 'En curso', cls: 'badge-success' }, FINISHED: { text: 'Finalizado', cls: 'badge bg-gray-100 text-gray-600' },
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Torneos</h1>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancelar' : '+ Nuevo Torneo'}
        </button>
      </div>

      {msg && <div className="mb-4 p-3 bg-blue-50 text-blue-700 rounded-lg text-sm">{msg}</div>}

      {showForm && (
        <form onSubmit={handleCreate} className="card mb-6 space-y-4">
          <h3 className="font-semibold text-gray-900">Crear Torneo</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input className="input-field" required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
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
          <button type="submit" className="btn-primary">Crear Torneo</button>
        </form>
      )}

      {isLoading ? <div className="card text-center py-12 text-gray-500">Cargando...</div> :
        tournaments.length === 0 ? <div className="card text-center py-12 text-gray-500">No hay torneos. Crea el primero.</div> :
        <div className="space-y-4">
          {tournaments.map(t => (
            <div key={t.id} className="card">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-lg font-semibold">{t.name}</h3>
                    <span className={statusLabels[t.status]?.cls || 'badge'}>{statusLabels[t.status]?.text || t.status}</span>
                  </div>
                  <p className="text-sm text-gray-500">{gameLabels[t.gameType]} &middot; {t._count?.tournamentTeams || 0} equipos &middot; {t._count?.matches || 0} partidos</p>
                </div>
                <div className="flex gap-2">
                  {(t.status === 'REGISTRATION' || t.status === 'DRAFT') && t._count?.tournamentTeams >= 2 && (
                    <button className="btn-accent text-sm px-4 py-2" onClick={() => handleGenerateFixture(t.id)}>Generar Fixture</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      }
    </div>
  );
}
