import { PaymentStatus } from './enums';

export interface PaymentOrder {
  id: string;
  tenantId: string;
  teamId: string;
  matchId?: string;
  tournamentId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  dueDate: string;
  paidAt?: string;
  description: string;
  isDeposit: boolean; // seña
}

export interface PaymentSplit {
  totalAmount: number;
  gatewayFee: number;
  aufaCommission: number;
  leagueAmount: number;
  aufaCommissionRate: number;
}

export interface TenantFinancials {
  tenantId: string;
  totalCollected: number;
  totalAufaCommission: number;
  totalGatewayFees: number;
  netRevenue: number;
  pendingPayments: number;
  overduePayments: number;
}

export interface SubscriptionInvoice {
  id: string;
  tenantId: string;
  amount: number;
  currency: string;
  period: string;
  status: PaymentStatus;
  dueDate: string;
  paidAt?: string;
}
