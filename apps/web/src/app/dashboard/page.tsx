'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useTenant } from '@/lib/tenant-context';
import { statsApi } from '@/lib/api';
import Link from 'next/link';

interface DashboardData {
  activeTournaments: number;
  tournaments: { id: string; name: string; status: string }[];
  totalTeams: number;
  totalPlayers: number;
  nextMatchday: number | null;
  nextMatch: { id: string; home: string; away: string; venue: string | null; scheduledAt: string | null } | null;
  matchProgress: { completed: number; total: number };
  activeSanctions: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { tenant, tenantId } = useTenant();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) return;
    statsApi.dashboard(tenantId)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [tenantId]);

  const progressPct = data && data.matchProgress.total > 0
    ? Math.round((data.matchProgress.completed / data.matchProgress.total) * 100)
    : 0;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Bienvenido, {user?.fullName?.split(' ')[0]}
        </h1>
        <p className="text-gray-500 mt-1">
          {tenant ? tenant.name : 'Panel de control AUFA'}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">
                {loading ? '-' : data?.activeTournaments ?? 0}
              </span>
            </div>
            <div>
              <p className="text-sm text-gray-500">Torneos Activos</p>
              <p className="text-xl font-bold text-gray-900">
                {loading ? '-' : data?.activeTournaments ?? 0}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">
                {loading ? '-' : data?.totalTeams ?? 0}
              </span>
            </div>
            <div>
              <p className="text-sm text-gray-500">Equipos</p>
              <p className="text-xl font-bold text-gray-900">
                {loading ? '-' : data?.totalTeams ?? 0}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">
                {loading ? '-' : data?.totalPlayers ?? 0}
              </span>
            </div>
            <div>
              <p className="text-sm text-gray-500">Jugadores</p>
              <p className="text-xl font-bold text-gray-900">
                {loading ? '-' : data?.totalPlayers ?? 0}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">
                {loading ? '-' : data?.nextMatchday ?? '-'}
              </span>
            </div>
            <div>
              <p className="text-sm text-gray-500">Proxima Fecha</p>
              <p className="text-xl font-bold text-gray-900">
                {loading ? '-' : data?.nextMatchday ? `Fecha ${data.nextMatchday}` : 'Completado'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Match Progress */}
      {data && data.matchProgress.total > 0 && (
        <div className="card mb-8">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-700">Progreso del Torneo</h3>
            <span className="text-sm text-gray-500">
              {data.matchProgress.completed} / {data.matchProgress.total} partidos jugados
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-primary h-3 rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            ></div>
          </div>
          {data.activeSanctions > 0 && (
            <p className="text-xs text-amber-600 mt-2">
              {data.activeSanctions} sancion(es) activa(s) pendiente(s)
            </p>
          )}
        </div>
      )}

      {/* Next Match */}
      {data?.nextMatch && (
        <div className="card mb-8 border-l-4 border-primary">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Proximo Partido</h3>
          <p className="text-lg font-bold text-gray-900">
            {data.nextMatch.home} vs {data.nextMatch.away}
          </p>
          <div className="flex gap-4 mt-1 text-sm text-gray-500">
            {data.nextMatch.venue && <span>{data.nextMatch.venue}</span>}
            {data.nextMatch.scheduledAt && (
              <span>
                {new Date(data.nextMatch.scheduledAt).toLocaleDateString('es-UY', {
                  weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                })}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid md:grid-cols-3 gap-6">
        <Link href="/dashboard/tournaments" className="card hover:shadow-md transition-shadow group">
          <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-primary transition-colors">
            Gestionar Torneos
          </h3>
          <p className="text-sm text-gray-500">
            Crear torneos, configurar reglas, generar fixtures y gestionar inscripciones.
          </p>
        </Link>

        <Link href="/dashboard/teams" className="card hover:shadow-md transition-shadow group">
          <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-primary transition-colors">
            Equipos y Planteles
          </h3>
          <p className="text-sm text-gray-500">
            Ver equipos registrados, planteles de jugadores y fichajes.
          </p>
        </Link>

        <Link href="/dashboard/matches" className="card hover:shadow-md transition-shadow group">
          <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-primary transition-colors">
            Cargar Resultados
          </h3>
          <p className="text-sm text-gray-500">
            Ingresar datos de partidos, goles, tarjetas y sanciones.
          </p>
        </Link>

        <Link href="/dashboard/standings" className="card hover:shadow-md transition-shadow group">
          <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-primary transition-colors">
            Tabla de Posiciones
          </h3>
          <p className="text-sm text-gray-500">
            Posiciones actualizadas automaticamente con cada resultado cargado.
          </p>
        </Link>

        <Link href="/dashboard/treasury" className="card hover:shadow-md transition-shadow group">
          <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-primary transition-colors">
            Finanzas (Smart Treasury)
          </h3>
          <p className="text-sm text-gray-500">
            Cobros, pagos, split automatico y control de deudas por equipo.
          </p>
        </Link>

        <Link href="/dashboard/passport" className="card hover:shadow-md transition-shadow group">
          <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-primary transition-colors">
            Mi Pasaporte AUFA
          </h3>
          <p className="text-sm text-gray-500">
            Tu identidad deportiva digital: estadisticas, ligas y ficha medica.
          </p>
        </Link>
      </div>
    </div>
  );
}
