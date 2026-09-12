'use client';

import { useEffect, useState } from 'react';
import { useTenant } from '@/lib/tenant-context';
import { useAuth } from '@/lib/auth-context';
import { tribunalApi } from '@/lib/api';

interface Sanction {
  id: string;
  severity: string;
  status: string;
  reason: string;
  matchesSuspended: number;
  matchesServed: number;
  isActive: boolean;
  tribunalNotes?: string;
  createdAt: string;
  player: { id: string; aufaId: string; fullName: string; photoUrl?: string };
}

type Tab = 'active' | 'pending' | 'history';

export default function SanctionsPage() {
  const { tenantId } = useTenant();
  const { token } = useAuth();
  const [sanctions, setSanctions] = useState<Sanction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('active');

  useEffect(() => {
    if (!tenantId || !token) return;
    tribunalApi.listSanctions(tenantId, token)
      .then(setSanctions)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [tenantId, token]);

  const activeSanctions = sanctions.filter(s => s.isActive && s.status !== 'PENDING_TRIBUNAL');
  const pendingSanctions = sanctions.filter(s => s.status === 'PENDING_TRIBUNAL');
  const historySanctions = sanctions.filter(s => !s.isActive && s.status !== 'PENDING_TRIBUNAL');

  const currentList = activeTab === 'active' ? activeSanctions
    : activeTab === 'pending' ? pendingSanctions
    : historySanctions;

  const severityLabels: Record<string, { text: string; cls: string }> = {
    LIGHT: { text: 'Leve', cls: 'bg-yellow-100 text-yellow-700' },
    GRAVE: { text: 'Grave', cls: 'bg-red-100 text-red-700' },
  };

  const statusLabels: Record<string, { text: string; cls: string }> = {
    AUTO_APPLIED: { text: 'Automatica', cls: 'bg-blue-100 text-blue-700' },
    PENDING_TRIBUNAL: { text: 'Pendiente Tribunal', cls: 'bg-amber-100 text-amber-700' },
    RESOLVED: { text: 'Resuelta', cls: 'bg-green-100 text-green-700' },
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Tribunal de Penas</h1>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit max-w-full">
        {([
          { key: 'active' as Tab, label: 'Sanciones Activas', count: activeSanctions.length },
          { key: 'pending' as Tab, label: 'Pendientes de Tribunal', count: pendingSanctions.length },
          { key: 'history' as Tab, label: 'Historial', count: historySanctions.length },
        ]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === tab.key
                ? 'bg-white shadow-sm text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label} {tab.count > 0 && <span className="ml-1 text-xs">({tab.count})</span>}
          </button>
        ))}
      </div>

      {/* Sanctions Info */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="card border-l-4 border-l-yellow-400">
          <h3 className="font-semibold text-gray-900 mb-2">Sanciones Leves (Automaticas)</h3>
          <p className="text-sm text-gray-500">
            Doble amarilla en un partido = 1 fecha de suspension.
            Se aplica automaticamente al cargar los datos del partido.
          </p>
        </div>
        <div className="card border-l-4 border-l-red-400">
          <h3 className="font-semibold text-gray-900 mb-2">Sanciones Graves (Tribunal)</h3>
          <p className="text-sm text-gray-500">
            Roja directa o agresion. El caso pasa al Tribunal de Penas
            de la liga para dictaminar la sancion correspondiente.
          </p>
        </div>
      </div>

      {/* Sanctions List */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">
          {activeTab === 'active' && 'Sanciones Activas'}
          {activeTab === 'pending' && 'Pendientes de Tribunal'}
          {activeTab === 'history' && 'Historial de Sanciones'}
        </h3>
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Cargando...</div>
        ) : currentList.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No hay sanciones {activeTab === 'active' ? 'activas' : activeTab === 'pending' ? 'pendientes' : 'en el historial'}.</p>
            <p className="text-sm text-gray-400 mt-1">
              Las sanciones se generan automaticamente al cargar tarjetas en los partidos.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {currentList.map(sanction => (
              <div key={sanction.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 bg-secondary/20 rounded-full flex items-center justify-center text-sm font-bold text-secondary">
                  {sanction.player.fullName[0]}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900">{sanction.player.fullName}</span>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${severityLabels[sanction.severity]?.cls || ''}`}>
                      {severityLabels[sanction.severity]?.text || sanction.severity}
                    </span>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusLabels[sanction.status]?.cls || ''}`}>
                      {statusLabels[sanction.status]?.text || sanction.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{sanction.reason}</p>
                  {sanction.isActive && (
                    <p className="text-xs text-gray-400 mt-1">
                      Fechas cumplidas: {sanction.matchesServed}/{sanction.matchesSuspended}
                    </p>
                  )}
                  {sanction.tribunalNotes && (
                    <p className="text-xs text-gray-500 mt-1 italic">Tribunal: {sanction.tribunalNotes}</p>
                  )}
                </div>
                <div className="text-right text-xs text-gray-400">
                  {new Date(sanction.createdAt).toLocaleDateString('es-UY')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
