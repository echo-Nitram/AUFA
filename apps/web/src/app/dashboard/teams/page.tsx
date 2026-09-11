'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useTenant } from '@/lib/tenant-context';
import { useAuth } from '@/lib/auth-context';
import { leagueApi, aufaIdApi } from '@/lib/api';

export default function TeamsPage() {
  const { tenantId } = useTenant();
  const { token } = useAuth();
  const [teams, setTeams] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [msg, setMsg] = useState('');
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
  const [teamDetail, setTeamDetail] = useState<any>(null);
  const [playerCI, setPlayerCI] = useState('');

  function loadTeams() {
    if (!tenantId) return;
    leagueApi.listTeams(tenantId).then(setTeams).catch(console.error).finally(() => setIsLoading(false));
  }
  useEffect(() => { loadTeams(); }, [tenantId]);

  async function handleCreateTeam(e: FormEvent) {
    e.preventDefault();
    if (!tenantId || !token) return;
    try {
      await leagueApi.createTeam(tenantId, token, { name: teamName });
      setTeamName('');
      setShowCreate(false);
      setMsg('Equipo creado');
      loadTeams();
    } catch (err: any) { setMsg(err.message); }
  }

  async function handleExpand(teamId: string) {
    if (expandedTeam === teamId) { setExpandedTeam(null); return; }
    if (!tenantId) return;
    const detail = await leagueApi.getTeam(tenantId, teamId);
    setTeamDetail(detail);
    setExpandedTeam(teamId);
  }

  async function handleAddPlayer(teamId: string) {
    if (!tenantId || !token || !playerCI) return;
    try {
      // First lookup CI to get playerId
      const lookup = await aufaIdApi.lookup(playerCI, token, tenantId);
      if (!lookup.exists) { setMsg('Jugador no registrado en AUFA'); return; }
      await leagueApi.addPlayerToTeam(tenantId, token, teamId, { playerId: lookup.player.id });
      setPlayerCI('');
      setMsg('Jugador fichado exitosamente');
      handleExpand(teamId);
    } catch (err: any) { setMsg(err.message); }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Equipos</h1>
        <button className="btn-primary" onClick={() => setShowCreate(!showCreate)}>{showCreate ? 'Cancelar' : '+ Nuevo Equipo'}</button>
      </div>

      {msg && <div className="mb-4 p-3 bg-blue-50 text-blue-700 rounded-lg text-sm">{msg}<button className="ml-2 underline" onClick={() => setMsg('')}>x</button></div>}

      {showCreate && (
        <form onSubmit={handleCreateTeam} className="card mb-6 flex items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Equipo</label>
            <input className="input-field" required value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="Los Celestes" />
          </div>
          <button type="submit" className="btn-primary">Crear</button>
        </form>
      )}

      {isLoading ? <div className="card text-center py-12 text-gray-500">Cargando...</div> :
        teams.length === 0 ? <div className="card text-center py-12 text-gray-500">No hay equipos registrados.</div> :
        <div className="space-y-4">
          {teams.map(team => (
            <div key={team.id} className="card">
              <div className="flex items-center justify-between cursor-pointer" onClick={() => handleExpand(team.id)}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary font-bold text-lg">{team.name[0]}</div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{team.name}</h3>
                    <p className="text-sm text-gray-500">{team._count?.teamPlayers || 0} jugadores</p>
                  </div>
                </div>
                <span className="text-gray-400">{expandedTeam === team.id ? '▲' : '▼'}</span>
              </div>

              {expandedTeam === team.id && teamDetail && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Plantel</h4>
                  {teamDetail.teamPlayers?.length > 0 ? (
                    <div className="space-y-2 mb-4">
                      {teamDetail.teamPlayers.map((tp: any) => (
                        <div key={tp.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                          <div className="w-8 h-8 bg-secondary/20 rounded-full flex items-center justify-center text-sm font-bold text-secondary">
                            {tp.shirtNumber || '#'}
                          </div>
                          <span className="text-sm font-medium">{tp.player.fullName}</span>
                          <span className="text-xs text-gray-400 ml-auto">{tp.player.aufaId}</span>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-sm text-gray-400 mb-4">Sin jugadores fichados</p>}

                  <div className="flex items-end gap-3">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Fichar por CI</label>
                      <input className="input-field text-sm" placeholder="CI del jugador" value={playerCI} onChange={e => setPlayerCI(e.target.value)} />
                    </div>
                    <button className="btn-primary text-sm px-4 py-2.5" onClick={() => handleAddPlayer(team.id)}>Fichar</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      }
    </div>
  );
}
