'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePublicLeague } from '@/lib/public-league-context';
import { leagueApi, matchApi, statsApi, tenantApi } from '@/lib/api';

export default function PublicLeaguePage() {
  const league = usePublicLeague();
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [standings, setStandings] = useState<any[]>([]);
  const [recentMatches, setRecentMatches] = useState<any[]>([]);
  const [nextMatches, setNextMatches] = useState<any[]>([]);
  const [scorers, setScorers] = useState<any[]>([]);
  const [leagueInfo, setLeagueInfo] = useState<any>(null);

  useEffect(() => {
    tenantApi.getBySlug(league.slug).then(setLeagueInfo).catch(console.error);

    leagueApi.listTournaments(league.id).then(data => {
      setTournaments(data);
      if (data.length > 0) {
        const t = data[0];
        Promise.all([
          leagueApi.getStandings(league.id, t.id).then(setStandings),
          matchApi.listByTournament(league.id, t.id).then(matches => {
            setRecentMatches(matches.filter((m: any) => m.status === 'COMPLETED').slice(-4).reverse());
            setNextMatches(matches.filter((m: any) => m.status === 'SCHEDULED').slice(0, 4));
          }),
          statsApi.topScorers(league.id, t.id).then(s => setScorers(s.slice(0, 5))),
        ]).catch(console.error);
      }
    }).catch(console.error);
  }, [league.id, league.slug]);

  const basePath = `/liga/${league.slug}`;

  const genderLabel: Record<string, string> = { MALE: 'Masculino', FEMALE: 'Femenino', MIXED: 'Mixto' };

  return (
    <div className="space-y-8">
      {/* Tournament info */}
      {tournaments.length > 0 && (
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">{tournaments[0].name}</h2>
          <div className="flex items-center justify-center gap-3 mt-2 flex-wrap">
            <span className="text-sm text-gray-500">
              {tournaments[0].status === 'IN_PROGRESS' ? 'En curso' :
               tournaments[0].status === 'REGISTRATION' ? 'Inscripciones abiertas' : tournaments[0].status}
            </span>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
              {tournaments[0].gameType}
            </span>
            {tournaments[0].gender && (
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                {genderLabel[tournaments[0].gender] || tournaments[0].gender}
              </span>
            )}
            {(tournaments[0].minAge || tournaments[0].maxAge) && (
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                {tournaments[0].minAge && tournaments[0].maxAge
                  ? `${tournaments[0].minAge}-${tournaments[0].maxAge} años`
                  : tournaments[0].minAge
                    ? `+${tournaments[0].minAge} años`
                    : `Sub ${tournaments[0].maxAge}`}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Mini Standings */}
        <div className="lg:col-span-2 min-w-0">
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Posiciones</h3>
              <Link href={`${basePath}/posiciones`} className="text-xs text-primary hover:underline whitespace-nowrap">Ver completa</Link>
            </div>
            {/* La tabla no entra en un celular: que scrollee ella, no la pagina. */}
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <th className="px-4 py-2 text-left w-8">#</th>
                  <th className="px-4 py-2 text-left">Equipo</th>
                  <th className="px-4 py-2 text-center">PJ</th>
                  <th className="px-4 py-2 text-center">G</th>
                  <th className="px-4 py-2 text-center">E</th>
                  <th className="px-4 py-2 text-center">P</th>
                  <th className="px-4 py-2 text-center">DG</th>
                  <th className="px-4 py-2 text-center font-bold">Pts</th>
                </tr>
              </thead>
              <tbody>
                {standings.slice(0, 8).map((team: any, i: number) => (
                  <tr key={team.teamId} className={`border-t border-gray-50 ${i < 2 ? 'bg-green-50/50' : ''}`}>
                    <td className="px-4 py-2.5 font-bold text-gray-400">{i + 1}</td>
                    <td className="px-4 py-2.5 font-medium text-gray-900">{team.team?.name}</td>
                    <td className="px-4 py-2.5 text-center text-gray-500">{team.played}</td>
                    <td className="px-4 py-2.5 text-center text-gray-500">{team.won}</td>
                    <td className="px-4 py-2.5 text-center text-gray-500">{team.drawn}</td>
                    <td className="px-4 py-2.5 text-center text-gray-500">{team.lost}</td>
                    <td className="px-4 py-2.5 text-center text-gray-500">{team.goalsFor - team.goalsAgainst}</td>
                    <td className="px-4 py-2.5 text-center font-bold text-gray-900">{team.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </div>

        {/* Top Scorers sidebar */}
        <div>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Goleadores</h3>
              <Link href={`${basePath}/goleadores`} className="text-xs text-primary hover:underline">Ver todos</Link>
            </div>
            <div className="divide-y divide-gray-50">
              {scorers.map((s: any) => (
                <div key={s.playerId} className="px-4 py-3 flex items-center gap-3">
                  <span className="text-sm font-bold text-gray-400 w-5">{s.position}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{s.playerName}</p>
                    <p className="text-xs text-gray-400">{s.teamName}</p>
                  </div>
                  <span className="text-lg font-bold text-primary">{s.goals}</span>
                </div>
              ))}
              {scorers.length === 0 && (
                <p className="px-4 py-6 text-sm text-gray-400 text-center">Sin datos</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Results + Upcoming */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent results */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Ultimos Resultados</h3>
            <Link href={`${basePath}/fixture`} className="text-xs text-primary hover:underline">Ver fixture</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentMatches.map((m: any) => (
              <div key={m.id} className="px-4 py-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-900 flex-1 text-right">{m.homeTeam?.name}</span>
                  <span className="mx-4 font-bold text-lg min-w-[60px] text-center">
                    {m.homeScore} - {m.awayScore}
                  </span>
                  <span className="font-medium text-gray-900 flex-1">{m.awayTeam?.name}</span>
                </div>
                <p className="text-xs text-gray-400 text-center mt-1">Fecha {m.matchday}</p>
              </div>
            ))}
            {recentMatches.length === 0 && (
              <p className="px-4 py-6 text-sm text-gray-400 text-center">Sin resultados aun</p>
            )}
          </div>
        </div>

        {/* Next matches */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Proximos Partidos</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {nextMatches.map((m: any) => (
              <div key={m.id} className="px-4 py-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-900 flex-1 text-right">{m.homeTeam?.name}</span>
                  <div className="mx-4 text-center min-w-[80px]">
                    {m.scheduledAt ? (
                      <>
                        <p className="text-xs text-gray-500 font-medium">
                          {new Date(m.scheduledAt).toLocaleDateString('es-UY', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </p>
                        <p className="text-xs text-primary font-bold">
                          {new Date(m.scheduledAt).toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </>
                    ) : (
                      <span className="text-xs text-gray-400">vs</span>
                    )}
                  </div>
                  <span className="font-medium text-gray-900 flex-1">{m.awayTeam?.name}</span>
                </div>
                <p className="text-xs text-gray-400 text-center mt-1">
                  Fecha {m.matchday}
                  {m.venue && ` - ${m.venue.name}`}
                </p>
              </div>
            ))}
            {nextMatches.length === 0 && (
              <p className="px-4 py-6 text-sm text-gray-400 text-center">No hay partidos programados</p>
            )}
          </div>
        </div>
      </div>
      {/* Venues & Pricing */}
      {leagueInfo && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Venues */}
          {leagueInfo.venues && leagueInfo.venues.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">Canchas</h3>
              </div>
              <div className="divide-y divide-gray-50">
                {leagueInfo.venues.map((v: any) => (
                  <div key={v.id} className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">{v.name}</p>
                    {v.address && <p className="text-xs text-gray-400 mt-0.5">{v.address}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pricing */}
          {(leagueInfo.matchFee || leagueInfo.refereeFee || leagueInfo.monthlyFee) && (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">Costos</h3>
              </div>
              <div className="divide-y divide-gray-50">
                {leagueInfo.matchFee && (
                  <div className="px-4 py-3 flex items-center justify-between">
                    <span className="text-sm text-gray-600">Cuota por partido</span>
                    <span className="text-sm font-bold text-gray-900">
                      {leagueInfo.currency || 'UYU'} {leagueInfo.matchFee}
                    </span>
                  </div>
                )}
                {leagueInfo.refereeFee && (
                  <div className="px-4 py-3 flex items-center justify-between">
                    <span className="text-sm text-gray-600">Arbitraje</span>
                    <span className="text-sm font-bold text-gray-900">
                      {leagueInfo.currency || 'UYU'} {leagueInfo.refereeFee}
                    </span>
                  </div>
                )}
                {leagueInfo.monthlyFee && (
                  <div className="px-4 py-3 flex items-center justify-between">
                    <span className="text-sm text-gray-600">Cuota mensual</span>
                    <span className="text-sm font-bold text-gray-900">
                      {leagueInfo.currency || 'UYU'} {leagueInfo.monthlyFee}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
