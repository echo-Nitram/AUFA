import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { sendEmails } from './mailer';
import { medicalClearanceExpiring } from './templates';

const router = Router();

/** Days before expiry at which a player gets warned. */
const WARN_AT_DAYS = [30, 7, 1, 0];

/**
 * Scheduled jobs are triggered from outside rather than by a timer inside the
 * process: a managed host may run several instances or none while idle, and a
 * timer would fire once per instance or not at all.
 */
function requireCronSecret(req: Request, res: Response, next: NextFunction) {
  const secret = env.cronSecret;
  if (!secret) {
    return res.status(503).json({ error: 'CRON_SECRET no esta configurado' });
  }

  const provided = req.headers.authorization?.replace('Bearer ', '');
  if (provided !== secret) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  next();
}

const daysUntil = (date: Date) =>
  Math.ceil((date.getTime() - Date.now()) / (24 * 60 * 60 * 1000));

/**
 * Warns players whose medical clearance is about to expire, or just did.
 *
 * The vision promises this alert is automatic; until now the status was only
 * visible to whoever went looking for it.
 */
router.post('/medical-expiry', requireCronSecret, async (_req: Request, res: Response) => {
  try {
    const horizon = new Date();
    horizon.setDate(horizon.getDate() + Math.max(...WARN_AT_DAYS));

    const clearances = await prisma.medicalClearance.findMany({
      where: { isActive: true, expiresAt: { lte: horizon } },
      include: {
        player: {
          select: {
            fullName: true,
            user: { select: { email: true } },
            teamPlayers: {
              where: { isActive: true },
              select: { team: { select: { tenant: { select: { name: true } } } } },
            },
          },
        },
      },
    });

    const emails = [];
    for (const clearance of clearances) {
      const daysLeft = daysUntil(clearance.expiresAt);

      // Only on the exact thresholds, so a player is not mailed every day.
      if (!WARN_AT_DAYS.includes(daysLeft)) continue;

      // A player with no league has nothing to be blocked from.
      const leagueName = clearance.player.teamPlayers[0]?.team.tenant.name;
      if (!leagueName) continue;

      emails.push(
        medicalClearanceExpiring(
          clearance.player.user.email,
          clearance.player.fullName,
          leagueName,
          clearance.expiresAt,
          daysLeft
        )
      );
    }

    const result = await sendEmails(emails);

    res.json({
      message: `${emails.length} avisos de ficha medica procesados`,
      notified: emails.length,
      ...result,
    });
  } catch (error) {
    console.error('MedicalExpiryJob error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
