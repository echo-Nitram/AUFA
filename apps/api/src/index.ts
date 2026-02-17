import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { prisma } from './config/database';

// Route imports
import authRoutes from './modules/auth/auth.routes';
import tenantRoutes from './modules/tenant/tenant.routes';
import aufaIdRoutes from './modules/aufa-id/aufa-id.routes';
import leagueRoutes from './modules/league/league.routes';
import matchRoutes from './modules/match/match.routes';
import fixtureRoutes from './modules/fixture/fixture.routes';
import treasuryRoutes from './modules/treasury/treasury.routes';
import tribunalRoutes from './modules/tribunal/tribunal.routes';
import refereeRoutes from './modules/referee/referee.routes';

const app = express();

// Global middleware
app.use(helmet());
app.use(cors({ origin: env.webUrl, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', version: '1.0.0', service: 'AUFA API' });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/aufa-id', aufaIdRoutes);
app.use('/api/league', leagueRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/fixtures', fixtureRoutes);
app.use('/api/treasury', treasuryRoutes);
app.use('/api/tribunal', tribunalRoutes);
app.use('/api/referees', refereeRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// Start server
async function main() {
  try {
    await prisma.$connect();
    console.log('Database connected');

    app.listen(env.port, () => {
      console.log(`
╔══════════════════════════════════════════╗
║            AUFA API Server               ║
║   Nube de Ligas - Platform Backend       ║
╠══════════════════════════════════════════╣
║  Port:    ${env.port}                          ║
║  Env:     ${env.nodeEnv.padEnd(29)}║
║  URL:     ${env.apiUrl.padEnd(29)}║
╚══════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();

export default app;
