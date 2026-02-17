import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { AuthRequest } from '../../middleware/auth';
import { env } from '../../config/env';

const createOrderSchema = z.object({
  teamId: z.string(),
  tournamentId: z.string(),
  matchId: z.string().optional(),
  amount: z.number().positive(),
  currency: z.string().default('UYU'),
  description: z.string().optional(),
  isDeposit: z.boolean().default(false),
  dueDate: z.string().refine((d) => !isNaN(Date.parse(d))),
});

/**
 * Calculate the payment split: gateway fee, AUFA commission, league amount.
 */
function calculateSplit(amount: number, commissionRate: number) {
  const gatewayFee = amount * 0.035; // ~3.5% typical gateway fee
  const aufaCommission = amount * commissionRate;
  const leagueAmount = amount - gatewayFee - aufaCommission;
  return { gatewayFee, aufaCommission, leagueAmount };
}

export async function listPaymentOrders(req: AuthRequest, res: Response) {
  try {
    const { status, teamId, tournamentId } = req.query;

    const orders = await prisma.paymentOrder.findMany({
      where: {
        tenantId: req.tenantId!,
        ...(status && { status: status as any }),
        ...(teamId && { teamId: teamId as string }),
        ...(tournamentId && { tournamentId: tournamentId as string }),
      },
      include: {
        team: { select: { id: true, name: true } },
        match: { select: { id: true, matchday: true, scheduledAt: true } },
      },
      orderBy: { dueDate: 'asc' },
    });

    res.json(orders);
  } catch (error) {
    console.error('ListPaymentOrders error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function createPaymentOrder(req: AuthRequest, res: Response) {
  try {
    const data = createOrderSchema.parse(req.body);

    const order = await prisma.paymentOrder.create({
      data: {
        ...data,
        tenantId: req.tenantId!,
        dueDate: new Date(data.dueDate),
      },
    });

    res.status(201).json(order);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Datos inválidos', details: error.errors });
    }
    console.error('CreatePaymentOrder error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * Process a payment: simulates payment gateway integration.
 * In production, this would integrate with MercadoPago/Stripe.
 */
export async function processPayment(req: AuthRequest, res: Response) {
  try {
    const order = await prisma.paymentOrder.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId! },
      include: { tenant: { select: { commissionRate: true } } },
    });

    if (!order) {
      return res.status(404).json({ error: 'Orden de pago no encontrada' });
    }

    if (order.status === 'PAID') {
      return res.status(400).json({ error: 'Esta orden ya fue pagada' });
    }

    const { externalPaymentId } = req.body; // From gateway callback

    const split = calculateSplit(order.amount, order.tenant.commissionRate);

    const updatedOrder = await prisma.paymentOrder.update({
      where: { id: order.id },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        externalPaymentId: externalPaymentId || `sim_${Date.now()}`,
        gatewayFee: split.gatewayFee,
        aufaCommission: split.aufaCommission,
        leagueAmount: split.leagueAmount,
      },
    });

    res.json({
      message: 'Pago procesado exitosamente',
      order: updatedOrder,
      split: {
        totalAmount: order.amount,
        gatewayFee: Math.round(split.gatewayFee * 100) / 100,
        aufaCommission: Math.round(split.aufaCommission * 100) / 100,
        leagueAmount: Math.round(split.leagueAmount * 100) / 100,
      },
    });
  } catch (error) {
    console.error('ProcessPayment error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * Generate payment orders for all teams in the next matchday.
 * 48 hours before each match.
 */
export async function generateMatchdayOrders(req: AuthRequest, res: Response) {
  try {
    const { tournamentId, matchday, amountPerTeam, currency } = req.body;

    const matches = await prisma.match.findMany({
      where: {
        tournamentId,
        matchday,
        tournament: { tenantId: req.tenantId! },
      },
    });

    if (matches.length === 0) {
      return res.status(404).json({ error: 'No hay partidos para esa fecha' });
    }

    const orders = [];
    for (const match of matches) {
      // Create order for home team
      orders.push({
        tenantId: req.tenantId!,
        teamId: match.homeTeamId,
        tournamentId,
        matchId: match.id,
        amount: amountPerTeam,
        currency: currency || 'UYU',
        description: `Cuota fecha ${matchday}`,
        isDeposit: false,
        dueDate: match.scheduledAt
          ? new Date(match.scheduledAt.getTime() - 48 * 60 * 60 * 1000) // 48h before
          : new Date(),
      });

      // Create order for away team
      orders.push({
        tenantId: req.tenantId!,
        teamId: match.awayTeamId,
        tournamentId,
        matchId: match.id,
        amount: amountPerTeam,
        currency: currency || 'UYU',
        description: `Cuota fecha ${matchday}`,
        isDeposit: false,
        dueDate: match.scheduledAt
          ? new Date(match.scheduledAt.getTime() - 48 * 60 * 60 * 1000)
          : new Date(),
      });
    }

    await prisma.paymentOrder.createMany({ data: orders });

    res.status(201).json({
      message: `${orders.length} órdenes de pago generadas para fecha ${matchday}`,
      totalOrders: orders.length,
    });
  } catch (error) {
    console.error('GenerateMatchdayOrders error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * Check unpaid teams before a match and apply default (loss by default).
 */
export async function checkAndApplyDefaults(req: AuthRequest, res: Response) {
  try {
    const match = await prisma.match.findFirst({
      where: { id: req.params.matchId },
      include: {
        paymentOrders: true,
        homeTeam: { select: { name: true } },
        awayTeam: { select: { name: true } },
        tournament: true,
      },
    });

    if (!match) {
      return res.status(404).json({ error: 'Partido no encontrado' });
    }

    const homeOrderPaid = match.paymentOrders.some(
      (o) => o.teamId === match.homeTeamId && o.status === 'PAID'
    );
    const awayOrderPaid = match.paymentOrders.some(
      (o) => o.teamId === match.awayTeamId && o.status === 'PAID'
    );

    const defaults: string[] = [];

    if (!homeOrderPaid && !awayOrderPaid) {
      // Both defaulted - no points for either
      await prisma.match.update({
        where: { id: match.id },
        data: { status: 'COMPLETED', homeScore: 0, awayScore: 0 },
      });
      defaults.push(match.homeTeam.name, match.awayTeam.name);
    } else if (!homeOrderPaid) {
      await prisma.match.update({
        where: { id: match.id },
        data: { status: 'DEFAULT_HOME', homeScore: 0, awayScore: 3 },
      });

      // Award points to away team
      await prisma.tournamentTeam.update({
        where: { tournamentId_teamId: { tournamentId: match.tournamentId, teamId: match.awayTeamId } },
        data: { won: { increment: 1 }, played: { increment: 1 }, points: { increment: match.tournament.pointsForWin }, goalsFor: { increment: 3 } },
      });
      await prisma.tournamentTeam.update({
        where: { tournamentId_teamId: { tournamentId: match.tournamentId, teamId: match.homeTeamId } },
        data: { lost: { increment: 1 }, played: { increment: 1 }, goalsAgainst: { increment: 3 } },
      });

      defaults.push(match.homeTeam.name);
    } else if (!awayOrderPaid) {
      await prisma.match.update({
        where: { id: match.id },
        data: { status: 'DEFAULT_AWAY', homeScore: 3, awayScore: 0 },
      });

      await prisma.tournamentTeam.update({
        where: { tournamentId_teamId: { tournamentId: match.tournamentId, teamId: match.homeTeamId } },
        data: { won: { increment: 1 }, played: { increment: 1 }, points: { increment: match.tournament.pointsForWin }, goalsFor: { increment: 3 } },
      });
      await prisma.tournamentTeam.update({
        where: { tournamentId_teamId: { tournamentId: match.tournamentId, teamId: match.awayTeamId } },
        data: { lost: { increment: 1 }, played: { increment: 1 }, goalsAgainst: { increment: 3 } },
      });

      defaults.push(match.awayTeam.name);
    }

    // Mark overdue orders as defaulted
    if (defaults.length > 0) {
      await prisma.paymentOrder.updateMany({
        where: { matchId: match.id, status: 'PENDING' },
        data: { status: 'DEFAULTED' },
      });
    }

    res.json({
      defaults: defaults.length > 0 ? defaults : null,
      message: defaults.length > 0
        ? `Equipos en default: ${defaults.join(', ')}`
        : 'Ambos equipos al día. El partido se juega normalmente.',
    });
  } catch (error) {
    console.error('CheckAndApplyDefaults error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function getFinancialSummary(req: AuthRequest, res: Response) {
  try {
    const orders = await prisma.paymentOrder.findMany({
      where: { tenantId: req.tenantId! },
    });

    const paid = orders.filter((o) => o.status === 'PAID');

    const summary = {
      totalCollected: paid.reduce((sum, o) => sum + o.amount, 0),
      totalAufaCommission: paid.reduce((sum, o) => sum + (o.aufaCommission || 0), 0),
      totalGatewayFees: paid.reduce((sum, o) => sum + (o.gatewayFee || 0), 0),
      netRevenue: paid.reduce((sum, o) => sum + (o.leagueAmount || 0), 0),
      pendingPayments: orders.filter((o) => o.status === 'PENDING').reduce((sum, o) => sum + o.amount, 0),
      overduePayments: orders.filter((o) => o.status === 'OVERDUE').reduce((sum, o) => sum + o.amount, 0),
      totalOrders: orders.length,
      paidOrders: paid.length,
    };

    res.json(summary);
  } catch (error) {
    console.error('GetFinancialSummary error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function getPlatformRevenue(req: AuthRequest, res: Response) {
  try {
    const allPaidOrders = await prisma.paymentOrder.findMany({
      where: { status: 'PAID' },
      include: { tenant: { select: { name: true } } },
    });

    const totalRevenue = allPaidOrders.reduce((sum, o) => sum + (o.aufaCommission || 0), 0);

    const byTenant = new Map<string, { name: string; total: number }>();
    for (const order of allPaidOrders) {
      const current = byTenant.get(order.tenantId) || { name: order.tenant.name, total: 0 };
      current.total += order.aufaCommission || 0;
      byTenant.set(order.tenantId, current);
    }

    res.json({
      totalPlatformRevenue: Math.round(totalRevenue * 100) / 100,
      totalTransactions: allPaidOrders.length,
      revenueByLeague: Array.from(byTenant.entries()).map(([id, data]) => ({
        tenantId: id,
        leagueName: data.name,
        revenue: Math.round(data.total * 100) / 100,
      })),
    });
  } catch (error) {
    console.error('GetPlatformRevenue error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function listSubscriptionInvoices(req: AuthRequest, res: Response) {
  try {
    const invoices = await prisma.subscriptionInvoice.findMany({
      include: { tenant: { select: { id: true, name: true, plan: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(invoices);
  } catch (error) {
    console.error('ListSubscriptionInvoices error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function createSubscriptionInvoice(req: AuthRequest, res: Response) {
  try {
    const { tenantId, amount, currency, period, dueDate } = req.body;

    const invoice = await prisma.subscriptionInvoice.create({
      data: {
        tenantId,
        amount,
        currency: currency || 'USD',
        period,
        dueDate: new Date(dueDate),
      },
    });

    res.status(201).json(invoice);
  } catch (error) {
    console.error('CreateSubscriptionInvoice error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}
