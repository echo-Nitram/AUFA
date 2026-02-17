'use client';

import { useEffect, useState } from 'react';
import { useTenant } from '@/lib/tenant-context';
import { useAuth } from '@/lib/auth-context';
import { refereeApi, leagueApi } from '@/lib/api';

interface Availability {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

interface Referee {
  id: string;
  fullName: string;
  phone: string | null;
  photoUrl: string | null;
  bio: string | null;
  certifications: string[];
  isAvailable: boolean;
  availability: Availability[];
  user: { email: string };
  totalMatchesOfficiated?: number;
}

interface MatchForAssign {
  id: string;
  matchday: number;
  scheduledAt: string | null;
  status: string;
  homeTeam: { id: string; name: string };
  awayTeam: { id: string; name: string };
  venue: { id: string; name: string } | null;
  referee: { id: string; fullName: string } | null;
}

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
const DAY_NAMES_FULL = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];

export default function RefereesPage() {
  const { tenantId } = useTenant();
  const { token } = useAuth();

  const [tab, setTab] = useState<'marketplace' | 'assignments' | 'register'>('marketplace');

  // Marketplace state
  const [referees, setReferees] = useState<Referee[]>([]);
  const [selectedReferee, setSelectedReferee] = useState<Referee | null>(null);
  const [filterDay, setFilterDay] = useState<number | undefined>(undefined);
  const [loadingReferees, setLoadingReferees] = useState(true);

  // Assignment state
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [selectedTournament, setSelectedTournament] = useState('');
  const [matches, setMatches] = useState<MatchForAssign[]>([]);
  const [assignRefereeId, setAssignRefereeId] = useState('');
  const [selectedMatches, setSelectedMatches] = useState<Set<string>>(new Set());
  const [msg, setMsg] = useState('');
  const [loadingMatches, setLoadingMatches] = useState(false);

  // Register form
  const [regForm, setRegForm] = useState({ email: '', fullName: '', phone: '', certifications: '' });
  const [regMsg, setRegMsg] = useState('');
  const [regMsgType, setRegMsgType] = useState<'success' | 'error'>('success');
  const [registering, setRegistering] = useState(false);

  // Load referees
  useEffect(() => {
    setLoadingReferees(true);
    refereeApi.listAvailable(filterDay)
      .then(setReferees)
      .catch(console.error)
      .finally(() => setLoadingReferees(false));
  }, [filterDay]);

  // Load referee profile when selected
  async function loadProfile(id: string) {
    try {
      const profile = await refereeApi.getProfile(id);
      setSelectedReferee(profile);
    } catch (err) {
      console.error(err);
    }
  }

  // Load tournaments for assignment tab
  useEffect(() => {
    if (!tenantId || tab !== 'assignments') return;
    leagueApi.listTournaments(tenantId).then(data => {
      setTournaments(data);
      if (data.length > 0 && !selectedTournament) setSelectedTournament(data[0].id);
    }).catch(console.error);
  }, [tenantId, tab]);

  // Load matches when tournament selected
  useEffect(() => {
    if (!tenantId || !selectedTournament) return;
    setLoadingMatches(true);
    refereeApi.listMatchesByTournament(tenantId, selectedTournament)
      .then(setMatches)
      .catch(console.error)
      .finally(() => setLoadingMatches(false));
  }, [tenantId, selectedTournament]);

  async function handleAssign() {
    if (!tenantId || !token || !assignRefereeId || selectedMatches.size === 0) return;
    setMsg('');
    try {
      const result = await refereeApi.hire(tenantId, token, assignRefereeId, Array.from(selectedMatches));
      setMsg(result.message);
      setSelectedMatches(new Set());
      setAssignRefereeId('');
      // Reload matches
      refereeApi.listMatchesByTournament(tenantId, selectedTournament).then(setMatches);
    } catch (err: any) {
      setMsg(err.message);
    }
  }

  function toggleMatch(matchId: string) {
    setSelectedMatches(prev => {
      const next = new Set(prev);
      if (next.has(matchId)) next.delete(matchId);
      else next.add(matchId);
      return next;
    });
  }

  // Group matches by matchday for calendar view
  const matchesByDay = matches.reduce((acc: Record<number, MatchForAssign[]>, m) => {
    if (!acc[m.matchday]) acc[m.matchday] = [];
    acc[m.matchday].push(m);
    return acc;
  }, {});

  const unassignedMatches = matches.filter(m => !m.referee && m.status === 'SCHEDULED');

  async function handleRegisterReferee(e: React.FormEvent) {
    e.preventDefault();
    if (!tenantId || !token) return;
    setRegMsg('');
    setRegistering(true);
    try {
      const certs = regForm.certifications.split(',').map(c => c.trim()).filter(Boolean);
      const result = await refereeApi.registerByAdmin(tenantId, token, {
        email: regForm.email,
        fullName: regForm.fullName,
        phone: regForm.phone || undefined,
        certifications: certs,
      });
      setRegMsg(result.message);
      setRegMsgType('success');
      setRegForm({ email: '', fullName: '', phone: '', certifications: '' });
      // Refresh referee list
      refereeApi.listAvailable().then(setReferees);
    } catch (err: any) {
      setRegMsg(err.message);
      setRegMsgType('error');
    } finally {
      setRegistering(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Arbitros</h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6 w-fit">
        <button
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            tab === 'marketplace' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setTab('marketplace')}
        >
          Marketplace
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            tab === 'assignments' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setTab('assignments')}
        >
          Asignaciones
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            tab === 'register' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setTab('register')}
        >
          Registrar Arbitro
        </button>
      </div>

      {/* Marketplace Tab */}
      {tab === 'marketplace' && (
        <div className="space-y-6">
          {/* Day filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Filtrar por dia:</span>
            <div className="flex gap-1">
              <button
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  filterDay === undefined ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                onClick={() => setFilterDay(undefined)}
              >
                Todos
              </button>
              {DAY_NAMES.map((name, i) => (
                <button
                  key={i}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    filterDay === i ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  onClick={() => setFilterDay(i)}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          {loadingReferees ? (
            <div className="text-center py-12 text-gray-500">Cargando arbitros...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {referees.map(ref => (
                <div
                  key={ref.id}
                  className={`card cursor-pointer transition-all hover:shadow-md ${
                    selectedReferee?.id === ref.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => loadProfile(ref.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-lg flex-shrink-0">
                      {ref.fullName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{ref.fullName}</h3>
                      <p className="text-xs text-gray-500">{ref.user.email}</p>
                      {ref.certifications.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {ref.certifications.map((cert, i) => (
                            <span key={i} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                              {cert}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Availability chips */}
                  {ref.availability.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-xs text-gray-400 mb-1.5">Disponibilidad:</p>
                      <div className="flex flex-wrap gap-1">
                        {ref.availability.map(slot => (
                          <span key={slot.id} className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded">
                            {DAY_NAMES[slot.dayOfWeek]} {slot.startTime}-{slot.endTime}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {referees.length === 0 && (
                <div className="col-span-full text-center py-12 text-gray-400">
                  No hay arbitros disponibles{filterDay !== undefined ? ` para ${DAY_NAMES_FULL[filterDay]}` : ''}
                </div>
              )}
            </div>
          )}

          {/* Profile detail panel */}
          {selectedReferee && (
            <div className="card bg-gray-50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Perfil de {selectedReferee.fullName}</h3>
                <button
                  className="text-sm text-gray-400 hover:text-gray-600"
                  onClick={() => setSelectedReferee(null)}
                >
                  Cerrar
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  {selectedReferee.bio && (
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Bio</p>
                      <p className="text-sm text-gray-700">{selectedReferee.bio}</p>
                    </div>
                  )}
                  {selectedReferee.phone && (
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Telefono</p>
                      <p className="text-sm text-gray-900">{selectedReferee.phone}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Certificaciones</p>
                    {selectedReferee.certifications.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {selectedReferee.certifications.map((cert, i) => (
                          <span key={i} className="text-sm bg-blue-50 text-blue-700 px-2 py-1 rounded">
                            {cert}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">Sin certificaciones</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Partidos dirigidos</p>
                    <p className="text-2xl font-bold text-primary">{selectedReferee.totalMatchesOfficiated || 0}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-gray-400 mb-2">Horarios disponibles</p>
                  {selectedReferee.availability.length > 0 ? (
                    <div className="space-y-1">
                      {selectedReferee.availability
                        .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
                        .map(slot => (
                          <div key={slot.id} className="flex items-center gap-2 text-sm">
                            <span className="w-20 font-medium text-gray-700">{DAY_NAMES_FULL[slot.dayOfWeek]}</span>
                            <span className="text-gray-500">{slot.startTime} - {slot.endTime}</span>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">Sin horarios definidos</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Assignments Tab */}
      {tab === 'assignments' && (
        <div className="space-y-6">
          {msg && (
            <div className="p-3 rounded-lg text-sm bg-blue-50 text-blue-700">{msg}</div>
          )}

          {/* Tournament selector */}
          <div className="flex items-center gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Torneo</label>
              <select
                className="input-field w-auto"
                value={selectedTournament}
                onChange={e => setSelectedTournament(e.target.value)}
              >
                {tournaments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>

            {unassignedMatches.length > 0 && (
              <div className="bg-amber-50 text-amber-700 text-sm px-3 py-2 rounded-lg">
                {unassignedMatches.length} partido{unassignedMatches.length !== 1 ? 's' : ''} sin arbitro
              </div>
            )}
          </div>

          {/* Assignment controls */}
          {selectedMatches.size > 0 && (
            <div className="card bg-primary/5 border border-primary/20">
              <h3 className="font-semibold text-gray-900 mb-3">
                Asignar arbitro a {selectedMatches.size} partido{selectedMatches.size !== 1 ? 's' : ''}
              </h3>
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="block text-sm text-gray-600 mb-1">Seleccionar arbitro</label>
                  <select
                    className="input-field"
                    value={assignRefereeId}
                    onChange={e => setAssignRefereeId(e.target.value)}
                  >
                    <option value="">-- Elegir arbitro --</option>
                    {referees.map(ref => (
                      <option key={ref.id} value={ref.id}>{ref.fullName}</option>
                    ))}
                  </select>
                </div>
                <button
                  className="btn-primary px-6 py-2.5"
                  onClick={handleAssign}
                  disabled={!assignRefereeId}
                >
                  Asignar
                </button>
                <button
                  className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2.5"
                  onClick={() => setSelectedMatches(new Set())}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Calendar/matchday view */}
          {loadingMatches ? (
            <div className="text-center py-12 text-gray-500">Cargando partidos...</div>
          ) : Object.keys(matchesByDay).length === 0 ? (
            <div className="card text-center py-12 text-gray-400">No hay partidos en este torneo</div>
          ) : (
            <div className="space-y-6">
              {Object.entries(matchesByDay)
                .sort(([a], [b]) => Number(a) - Number(b))
                .map(([matchday, dayMatches]) => (
                  <div key={matchday}>
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-lg font-bold text-gray-900">Fecha {matchday}</h3>
                      {dayMatches.some(m => !m.referee && m.status === 'SCHEDULED') && (
                        <span className="text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full">
                          Sin arbitro
                        </span>
                      )}
                    </div>

                    <div className="bg-white rounded-xl shadow-sm overflow-hidden divide-y divide-gray-50">
                      {dayMatches.map(match => {
                        const needsRef = !match.referee && match.status === 'SCHEDULED';
                        const isSelected = selectedMatches.has(match.id);

                        return (
                          <div
                            key={match.id}
                            className={`px-4 py-3 flex items-center gap-4 ${
                              needsRef ? 'cursor-pointer hover:bg-amber-50/50' : ''
                            } ${isSelected ? 'bg-primary/5' : ''}`}
                            onClick={() => needsRef && toggleMatch(match.id)}
                          >
                            {/* Checkbox for unassigned */}
                            <div className="w-6 flex-shrink-0">
                              {needsRef && (
                                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                  isSelected ? 'bg-primary border-primary' : 'border-gray-300'
                                }`}>
                                  {isSelected && (
                                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Match info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900 text-sm">{match.homeTeam.name}</span>
                                <span className="text-xs text-gray-400">vs</span>
                                <span className="font-medium text-gray-900 text-sm">{match.awayTeam.name}</span>
                              </div>
                              <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                                {match.scheduledAt && (
                                  <span>
                                    {new Date(match.scheduledAt).toLocaleDateString('es-UY', {
                                      weekday: 'short', day: 'numeric', month: 'short',
                                    })}
                                    {' '}
                                    {new Date(match.scheduledAt).toLocaleTimeString('es-UY', {
                                      hour: '2-digit', minute: '2-digit',
                                    })}
                                  </span>
                                )}
                                {match.venue && <span>{match.venue.name}</span>}
                              </div>
                            </div>

                            {/* Status */}
                            <div className="flex-shrink-0 text-right">
                              {match.status !== 'SCHEDULED' ? (
                                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">
                                  {match.status === 'COMPLETED' ? 'Jugado' : match.status}
                                </span>
                              ) : null}
                            </div>

                            {/* Referee badge */}
                            <div className="w-40 flex-shrink-0 text-right">
                              {match.referee ? (
                                <span className="inline-flex items-center gap-1.5 text-sm">
                                  <span className="w-6 h-6 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-xs font-bold">
                                    {match.referee.fullName[0]}
                                  </span>
                                  <span className="text-gray-700 truncate">{match.referee.fullName}</span>
                                </span>
                              ) : match.status === 'SCHEDULED' ? (
                                <span className="text-xs text-amber-500 font-medium">Sin asignar</span>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Register Tab */}
      {tab === 'register' && (
        <div className="max-w-lg">
          {regMsg && (
            <div className={`mb-4 p-3 rounded-lg text-sm ${regMsgType === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
              {regMsg}
            </div>
          )}

          <form onSubmit={handleRegisterReferee} className="card space-y-4">
            <h3 className="font-semibold text-gray-900 mb-2">Registrar Nuevo Arbitro</h3>
            <p className="text-sm text-gray-500 mb-4">
              Se crea una cuenta con contrasena temporal que el arbitro podra cambiar.
            </p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
              <input type="text" className="input-field" placeholder="Carlos Perez" required
                value={regForm.fullName} onChange={e => setRegForm(p => ({ ...p, fullName: e.target.value }))} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" className="input-field" placeholder="arbitro@email.com" required
                value={regForm.email} onChange={e => setRegForm(p => ({ ...p, email: e.target.value }))} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefono</label>
              <input type="text" className="input-field" placeholder="099 123 456"
                value={regForm.phone} onChange={e => setRegForm(p => ({ ...p, phone: e.target.value }))} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Certificaciones</label>
              <input type="text" className="input-field" placeholder="Nacional, FIFA (separar con comas)"
                value={regForm.certifications} onChange={e => setRegForm(p => ({ ...p, certifications: e.target.value }))} />
              <p className="text-xs text-gray-400 mt-1">Separa las certificaciones con comas</p>
            </div>

            <button type="submit" className="btn-primary w-full" disabled={registering}>
              {registering ? 'Registrando...' : 'Registrar Arbitro'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
