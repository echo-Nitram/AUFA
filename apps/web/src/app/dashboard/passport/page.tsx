'use client';

import { useAuth } from '@/lib/auth-context';
import { useEffect, useState } from 'react';
import { aufaIdApi } from '@/lib/api';

interface PassportData {
  aufaId: string;
  fullName: string;
  photoUrl?: string;
  identityStatus: string;
  medicalClearance?: { expiresAt: string; isActive: boolean };
  career: {
    totalMatches: number;
    totalGoals: number;
    totalAssists: number;
    totalYellowCards: number;
    totalRedCards: number;
  };
  leagues: { id: string; name: string; slug: string }[];
}

export default function PassportPage() {
  const { user } = useAuth();
  const [passport, setPassport] = useState<PassportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.playerId) {
      setIsLoading(false);
      return;
    }
    aufaIdApi.getPassport(user.playerId)
      .then(setPassport)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [user]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-gray-500">Cargando pasaporte...</div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Pasaporte Deportivo AUFA</h1>

      <div className="max-w-2xl mx-auto">
        {/* Passport Card */}
        <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 rounded-2xl p-8 text-white shadow-xl mb-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-xs text-blue-300 uppercase tracking-wider mb-1">AUFA ID</p>
              <p className="text-lg font-mono font-bold">
                {passport?.aufaId || user?.aufaId || '---'}
              </p>
            </div>
            <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center font-bold text-xl">
              A
            </div>
          </div>

          <div className="flex items-center gap-6 mb-6">
            <div className="w-20 h-20 bg-white/20 rounded-xl flex items-center justify-center text-3xl font-bold">
              {passport?.fullName?.[0] || user?.fullName?.[0] || '?'}
            </div>
            <div>
              <h2 className="text-2xl font-bold">{passport?.fullName || user?.fullName || 'Jugador'}</h2>
              <p className="text-blue-200">{user?.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-blue-300">Identidad</p>
              <p className="font-medium">
                {(passport?.identityStatus || 'PENDING') === 'APPROVED' ? 'Verificada' : 'Pendiente'}
              </p>
            </div>
            <div>
              <p className="text-xs text-blue-300">Ficha Medica</p>
              <p className="font-medium">
                {passport?.medicalClearance
                  ? `Vence: ${new Date(passport.medicalClearance.expiresAt).toLocaleDateString('es-UY')}`
                  : 'No cargada'}
              </p>
            </div>
          </div>
        </div>

        {/* Career Stats */}
        <div className="card mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">Estadisticas de Carrera</h3>
          <div className="grid grid-cols-5 gap-4">
            {[
              { label: 'Partidos', value: passport?.career.totalMatches || 0 },
              { label: 'Goles', value: passport?.career.totalGoals || 0 },
              { label: 'Asistencias', value: passport?.career.totalAssists || 0 },
              { label: 'Amarillas', value: passport?.career.totalYellowCards || 0 },
              { label: 'Rojas', value: passport?.career.totalRedCards || 0 },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Leagues */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Ligas</h3>
          {passport?.leagues && passport.leagues.length > 0 ? (
            <div className="space-y-3">
              {passport.leagues.map((league) => (
                <div key={league.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 bg-primary rounded flex items-center justify-center text-white text-sm font-bold">
                    {league.name[0]}
                  </div>
                  <span className="font-medium text-gray-900">{league.name}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Aun no participas en ninguna liga.</p>
          )}
        </div>
      </div>
    </div>
  );
}
