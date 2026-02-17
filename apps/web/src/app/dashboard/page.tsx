'use client';

import { useAuth } from '@/lib/auth-context';
import { useTenant } from '@/lib/tenant-context';
import Link from 'next/link';

export default function DashboardPage() {
  const { user } = useAuth();
  const { tenant } = useTenant();

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
        {[
          { label: 'Torneos Activos', value: '-', color: 'bg-blue-500' },
          { label: 'Equipos', value: '-', color: 'bg-green-500' },
          { label: 'Jugadores', value: '-', color: 'bg-purple-500' },
          { label: 'Proxima Fecha', value: '-', color: 'bg-amber-500' },
        ].map((stat, i) => (
          <div key={i} className="card">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center`}>
                <span className="text-white font-bold text-lg">{stat.value}</span>
              </div>
              <div>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

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
