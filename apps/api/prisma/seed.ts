import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Create Super Admin
  const superAdminPassword = await bcrypt.hash('admin123', 12);
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@aufa.uy' },
    update: {},
    create: {
      email: 'admin@aufa.uy',
      passwordHash: superAdminPassword,
      role: 'SUPER_ADMIN',
    },
  });
  console.log('Super Admin created:', superAdmin.email);

  // 2. Create a demo tenant (Liga Demo)
  const demoTenant = await prisma.tenant.upsert({
    where: { slug: 'liga-demo' },
    update: {},
    create: {
      name: 'Liga Demo Montevideo',
      slug: 'liga-demo',
      subdomain: 'liga-demo',
      plan: 'LIGA_PRO',
      primaryColor: '#1a56db',
      secondaryColor: '#1e3a5f',
      accentColor: '#f59e0b',
    },
  });
  console.log('Demo tenant created:', demoTenant.name);

  // 3. Create League Admin
  const leagueAdminPassword = await bcrypt.hash('liga123', 12);
  const leagueAdmin = await prisma.user.upsert({
    where: { email: 'organizador@ligademo.uy' },
    update: {},
    create: {
      email: 'organizador@ligademo.uy',
      passwordHash: leagueAdminPassword,
      role: 'PLAYER',
    },
  });

  await prisma.tenantMember.upsert({
    where: { tenantId_userId: { tenantId: demoTenant.id, userId: leagueAdmin.id } },
    update: {},
    create: {
      tenantId: demoTenant.id,
      userId: leagueAdmin.id,
      role: 'ADMIN',
    },
  });
  console.log('League Admin created:', leagueAdmin.email);

  // 4. Create demo players
  const playerData = [
    { ci: '12345678', fullName: 'Martín González', email: 'martin@example.com' },
    { ci: '23456789', fullName: 'Diego Fernández', email: 'diego@example.com' },
    { ci: '34567890', fullName: 'Santiago López', email: 'santiago@example.com' },
    { ci: '45678901', fullName: 'Matías Rodríguez', email: 'matias@example.com' },
    { ci: '56789012', fullName: 'Facundo Martínez', email: 'facundo@example.com' },
    { ci: '67890123', fullName: 'Nicolás Silva', email: 'nicolas@example.com' },
    { ci: '78901234', fullName: 'Agustín Pérez', email: 'agustin@example.com' },
    { ci: '89012345', fullName: 'Federico García', email: 'federico@example.com' },
    { ci: '90123456', fullName: 'Sebastián Díaz', email: 'sebastian@example.com' },
    { ci: '01234567', fullName: 'Joaquín Castro', email: 'joaquin@example.com' },
  ];

  const playerPassword = await bcrypt.hash('player123', 12);
  const players = [];

  for (const p of playerData) {
    const user = await prisma.user.upsert({
      where: { email: p.email },
      update: {},
      create: {
        email: p.email,
        passwordHash: playerPassword,
        role: 'PLAYER',
        player: {
          create: {
            ci: p.ci,
            fullName: p.fullName,
            dateOfBirth: new Date('1995-06-15'),
            identityStatus: 'APPROVED',
            medicalClearances: {
              create: {
                documentUrl: '/uploads/medical/placeholder.pdf',
                issuedAt: new Date(),
                expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
                isActive: true,
              },
            },
          },
        },
      },
      include: { player: true },
    });
    players.push(user.player!);
  }
  console.log(`${players.length} players created`);

  // 5. Create demo teams
  const team1 = await prisma.team.upsert({
    where: { tenantId_name: { tenantId: demoTenant.id, name: 'Los Celestes' } },
    update: {},
    create: {
      tenantId: demoTenant.id,
      name: 'Los Celestes',
      captainPlayerId: players[0].id,
    },
  });

  const team2 = await prisma.team.upsert({
    where: { tenantId_name: { tenantId: demoTenant.id, name: 'Los Rojinegros' } },
    update: {},
    create: {
      tenantId: demoTenant.id,
      name: 'Los Rojinegros',
      captainPlayerId: players[5].id,
    },
  });

  // Add players to teams
  for (let i = 0; i < 5; i++) {
    await prisma.teamPlayer.upsert({
      where: { teamId_playerId: { teamId: team1.id, playerId: players[i].id } },
      update: {},
      create: { teamId: team1.id, playerId: players[i].id, shirtNumber: i + 1 },
    });
  }
  for (let i = 5; i < 10; i++) {
    await prisma.teamPlayer.upsert({
      where: { teamId_playerId: { teamId: team2.id, playerId: players[i].id } },
      update: {},
      create: { teamId: team2.id, playerId: players[i].id, shirtNumber: i - 4 },
    });
  }
  console.log('Teams and rosters created');

  // 6. Create a venue
  const venue = await prisma.venue.upsert({
    where: { id: 'demo-venue' },
    update: {},
    create: {
      id: 'demo-venue',
      tenantId: demoTenant.id,
      name: 'Cancha Central Demo',
      address: 'Av. 18 de Julio 1234, Montevideo',
      slots: {
        create: [
          { dayOfWeek: 6, startTime: '14:00', endTime: '15:00' }, // Saturday 2pm
          { dayOfWeek: 6, startTime: '15:00', endTime: '16:00' }, // Saturday 3pm
          { dayOfWeek: 0, startTime: '10:00', endTime: '11:00' }, // Sunday 10am
          { dayOfWeek: 0, startTime: '11:00', endTime: '12:00' }, // Sunday 11am
        ],
      },
    },
  });
  console.log('Venue created:', venue.name);

  // 7. Create demo tournament
  const tournament = await prisma.tournament.upsert({
    where: { id: 'demo-tournament' },
    update: {},
    create: {
      id: 'demo-tournament',
      tenantId: demoTenant.id,
      name: 'Torneo Apertura 2026',
      status: 'REGISTRATION',
      gameType: 'F5',
      pointsForWin: 3,
      pointsForDraw: 1,
      pointsForLoss: 0,
      fairPlayBonusPoints: 1,
      tiebreakerOrder: ['GOAL_DIFFERENCE', 'GOALS_FOR', 'FAIR_PLAY'],
      playersPerTeam: 5,
      minPlayersToStart: 4,
      maxTeams: 12,
      registrationFee: 5000,
      depositAmount: 2000,
      tournamentTeams: {
        create: [
          { teamId: team1.id },
          { teamId: team2.id },
        ],
      },
    },
  });
  console.log('Tournament created:', tournament.name);

  console.log('\nSeed completed successfully!');
  console.log('\nDemo credentials:');
  console.log('  Super Admin:  admin@aufa.uy / admin123');
  console.log('  League Admin: organizador@ligademo.uy / liga123');
  console.log('  Players:      martin@example.com / player123 (and others)');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
