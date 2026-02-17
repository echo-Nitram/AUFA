'use client';

import { useEffect, useState } from 'react';
import { useTenant } from '@/lib/tenant-context';
import { useAuth } from '@/lib/auth-context';
import { treasuryApi } from '@/lib/api';

interface FinancialSummary {
  totalCollected: number;
  totalAufaCommission: number;
  totalGatewayFees: number;
  netRevenue: number;
  pendingPayments: number;
  overduePayments: number;
  totalOrders: number;
  paidOrders: number;
}

interface PaymentOrder {
  id: string;
  amount: number;
  currency: string;
  status: string;
  isDeposit: boolean;
  description?: string;
  dueDate: string;
  paidAt?: string;
  team: { id: string; name: string };
  match?: { id: string; matchday: number; scheduledAt?: string };
}

export default function TreasuryPage() {
  const { tenantId } = useTenant();
  const { token } = useAuth();
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [orders, setOrders] = useState<PaymentOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!tenantId || !token) return;
    Promise.all([
      treasuryApi.getSummary(tenantId, token).catch(() => null),
      treasuryApi.listOrders(tenantId, token).catch(() => []),
    ]).then(([summaryData, ordersData]) => {
      if (summaryData) setSummary(summaryData);
      setOrders(ordersData);
    }).finally(() => setIsLoading(false));
  }, [tenantId, token]);

  const formatAmount = (amount: number) =>
    new Intl.NumberFormat('es-UY', { style: 'currency', currency: 'UYU', minimumFractionDigits: 0 }).format(amount);

  const statusLabels: Record<string, { text: string; cls: string }> = {
    PENDING: { text: 'Pendiente', cls: 'bg-amber-100 text-amber-700' },
    PAID: { text: 'Pagado', cls: 'bg-green-100 text-green-700' },
    OVERDUE: { text: 'Vencido', cls: 'bg-red-100 text-red-700' },
    DEFAULTED: { text: 'Default', cls: 'bg-gray-100 text-gray-700' },
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Smart Treasury</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          { label: 'Total Recaudado', value: formatAmount(summary?.totalCollected || 0), sub: `${summary?.paidOrders || 0} pagos`, color: 'text-green-600' },
          { label: 'Comision AUFA (4%)', value: formatAmount(summary?.totalAufaCommission || 0), sub: 'UYU', color: 'text-blue-600' },
          { label: 'Pagos Pendientes', value: formatAmount(summary?.pendingPayments || 0), sub: `${orders.filter(o => o.status === 'PENDING').length} ordenes`, color: 'text-amber-600' },
          { label: 'Ingresos Netos', value: formatAmount(summary?.netRevenue || 0), sub: 'UYU', color: 'text-purple-600' },
        ].map((stat, i) => (
          <div key={i} className="card">
            <p className="text-sm text-gray-500 mb-1">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-gray-400">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-3">Generar Ordenes de Pago</h3>
          <p className="text-sm text-gray-500 mb-4">
            Genera ordenes de cobro automaticas para todos los equipos de la proxima fecha.
            Se generan 48 horas antes del partido.
          </p>
          <button className="btn-primary">Generar Ordenes</button>
        </div>

        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-3">Verificar Deudas (Pre-Partido)</h3>
          <p className="text-sm text-gray-500 mb-4">
            Verifica pagos pendientes antes de un partido. Equipos morosos pierden puntos por default.
          </p>
          <button className="btn-accent">Verificar Pagos</button>
        </div>
      </div>

      {/* Payment Orders Table */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">Ordenes de Pago ({orders.length})</h3>
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Cargando...</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No hay ordenes de pago registradas.</p>
            <p className="text-sm text-gray-400 mt-1">Las ordenes se generan automaticamente para cada fecha del torneo.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-2 font-medium text-gray-500">Equipo</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-500">Descripcion</th>
                  <th className="text-center py-3 px-2 font-medium text-gray-500">Fecha</th>
                  <th className="text-right py-3 px-2 font-medium text-gray-500">Monto</th>
                  <th className="text-center py-3 px-2 font-medium text-gray-500">Vencimiento</th>
                  <th className="text-center py-3 px-2 font-medium text-gray-500">Estado</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-2 font-medium">{order.team.name}</td>
                    <td className="py-3 px-2 text-gray-600">{order.description || (order.isDeposit ? 'Sena' : 'Cuota')}</td>
                    <td className="py-3 px-2 text-center text-gray-500">{order.match ? `Fecha ${order.match.matchday}` : '-'}</td>
                    <td className="py-3 px-2 text-right font-medium">{formatAmount(order.amount)}</td>
                    <td className="py-3 px-2 text-center text-gray-500">{new Date(order.dueDate).toLocaleDateString('es-UY')}</td>
                    <td className="py-3 px-2 text-center">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${statusLabels[order.status]?.cls || 'bg-gray-100'}`}>
                        {statusLabels[order.status]?.text || order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
