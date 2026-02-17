import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ── Helpers ─────────────────────────────────────────────
function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function daysAgo(d: number) {
  return new Date(Date.now() - d * 86400000);
}
function daysFromNow(d: number) {
  return new Date(Date.now() + d * 86400000);
}

async function main() {
  console.log('🌱 Seeding database with comprehensive demo data...\n');

  const passwordHash = await bcrypt.hash('player123', 12);
  const adminHash = await bcrypt.hash('admin123', 12);
  const ligaHash = await bcrypt.hash('liga123', 12);

  // ════════════════════════════════════════════════════════
  // 1. SUPER ADMIN
  // ════════════════════════════════════════════════════════
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@aufa.uy' },
    update: {},
    create: { email: 'admin@aufa.uy', passwordHash: adminHash, role: 'SUPER_ADMIN' },
  });
  console.log('✓ Super Admin: admin@aufa.uy / admin123');

  // ════════════════════════════════════════════════════════
  // 2. TENANT (Liga)
  // ════════════════════════════════════════════════════════
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'liga-demo' },
    update: {},
    create: {
      name: 'Liga Universitaria de Fútbol 5',
      slug: 'liga-demo',
      subdomain: 'liga-demo',
      plan: 'LIGA_PRO',
      primaryColor: '#1a56db',
      secondaryColor: '#1e3a5f',
      accentColor: '#f59e0b',
      commissionRate: 0.04,
    },
  });
  console.log('✓ Tenant:', tenant.name);

  // ════════════════════════════════════════════════════════
  // 3. LEAGUE ADMIN (Organizador)
  // ════════════════════════════════════════════════════════
  const orgUser = await prisma.user.upsert({
    where: { email: 'organizador@ligademo.uy' },
    update: {},
    create: { email: 'organizador@ligademo.uy', passwordHash: ligaHash, role: 'PLAYER' },
  });
  await prisma.tenantMember.upsert({
    where: { tenantId_userId: { tenantId: tenant.id, userId: orgUser.id } },
    update: {},
    create: { tenantId: tenant.id, userId: orgUser.id, role: 'ADMIN' },
  });
  console.log('✓ Organizador: organizador@ligademo.uy / liga123');

  // ════════════════════════════════════════════════════════
  // 4. REFEREE
  // ════════════════════════════════════════════════════════
  const refUser = await prisma.user.upsert({
    where: { email: 'arbitro@aufa.uy' },
    update: {},
    create: { email: 'arbitro@aufa.uy', passwordHash: adminHash, role: 'REFEREE' },
  });
  const referee = await prisma.referee.upsert({
    where: { userId: refUser.id },
    update: {},
    create: {
      userId: refUser.id,
      fullName: 'Carlos Abal',
      phone: '099123456',
      certifications: ['FIFA', 'AUF Nacional'],
      isAvailable: true,
    },
  });
  console.log('✓ Árbitro: Carlos Abal');

  // ════════════════════════════════════════════════════════
  // 5. VENUES
  // ════════════════════════════════════════════════════════
  const venue1 = await prisma.venue.upsert({
    where: { id: 'venue-parque-batlle' },
    update: {},
    create: {
      id: 'venue-parque-batlle',
      tenantId: tenant.id,
      name: 'Complejo Parque Batlle',
      address: 'Av. Dr. Américo Ricaldoni 2120, Montevideo',
      slots: {
        create: [
          { dayOfWeek: 6, startTime: '14:00', endTime: '15:00' },
          { dayOfWeek: 6, startTime: '15:00', endTime: '16:00' },
          { dayOfWeek: 6, startTime: '16:00', endTime: '17:00' },
          { dayOfWeek: 6, startTime: '17:00', endTime: '18:00' },
          { dayOfWeek: 0, startTime: '09:00', endTime: '10:00' },
          { dayOfWeek: 0, startTime: '10:00', endTime: '11:00' },
          { dayOfWeek: 0, startTime: '11:00', endTime: '12:00' },
          { dayOfWeek: 0, startTime: '12:00', endTime: '13:00' },
        ],
      },
    },
  });
  const venue2 = await prisma.venue.upsert({
    where: { id: 'venue-buceo' },
    update: {},
    create: {
      id: 'venue-buceo',
      tenantId: tenant.id,
      name: 'Cancha Buceo Indoor',
      address: 'Bvar. Batlle y Ordóñez 3410, Montevideo',
      slots: {
        create: [
          { dayOfWeek: 3, startTime: '20:00', endTime: '21:00' },
          { dayOfWeek: 3, startTime: '21:00', endTime: '22:00' },
          { dayOfWeek: 5, startTime: '20:00', endTime: '21:00' },
          { dayOfWeek: 5, startTime: '21:00', endTime: '22:00' },
        ],
      },
    },
  });
  console.log('✓ 2 canchas creadas');

  // ════════════════════════════════════════════════════════
  // 6. PLAYERS (56 jugadores, 7 por equipo)
  // ════════════════════════════════════════════════════════
  const allPlayerData = [
    // Los Celestes (equipo 0)
    { ci: '12345678', name: 'Martín González', email: 'martin@example.com', dob: '1995-06-15' },
    { ci: '12345679', name: 'Diego Fernández', email: 'diego.f@example.com', dob: '1997-03-22' },
    { ci: '12345680', name: 'Santiago López', email: 'santi.l@example.com', dob: '1998-11-08' },
    { ci: '12345681', name: 'Matías Rodríguez', email: 'matias.r@example.com', dob: '1996-01-30' },
    { ci: '12345682', name: 'Facundo Martínez', email: 'facu.m@example.com', dob: '1999-07-14' },
    { ci: '12345683', name: 'Nicolás Silva', email: 'nico.s@example.com', dob: '1994-09-03' },
    { ci: '12345684', name: 'Agustín Pérez', email: 'agus.p@example.com', dob: '2000-02-18' },
    // Los Rojinegros (equipo 1)
    { ci: '23456780', name: 'Federico García', email: 'fede.g@example.com', dob: '1996-04-12' },
    { ci: '23456781', name: 'Sebastián Díaz', email: 'seba.d@example.com', dob: '1995-12-25' },
    { ci: '23456782', name: 'Joaquín Castro', email: 'joaquin.c@example.com', dob: '1997-08-19' },
    { ci: '23456783', name: 'Alejandro Suárez', email: 'ale.s@example.com', dob: '1998-05-07' },
    { ci: '23456784', name: 'Bruno Acosta', email: 'bruno.a@example.com', dob: '1999-10-31' },
    { ci: '23456785', name: 'Gastón Ramírez', email: 'gaston.r@example.com', dob: '1994-06-22' },
    { ci: '23456786', name: 'Emiliano Torres', email: 'emi.t@example.com', dob: '2001-01-15' },
    // Deportivo Sur (equipo 2)
    { ci: '34567890', name: 'Rodrigo Álvarez', email: 'rodrigo.a@example.com', dob: '1996-07-28' },
    { ci: '34567891', name: 'Leandro Olivera', email: 'lean.o@example.com', dob: '1995-03-14' },
    { ci: '34567892', name: 'Maximiliano Ríos', email: 'maxi.r@example.com', dob: '1997-11-02' },
    { ci: '34567893', name: 'Gonzalo Méndez', email: 'gonza.m@example.com', dob: '1998-08-16' },
    { ci: '34567894', name: 'Ignacio Pereira', email: 'nacho.p@example.com', dob: '1999-02-09' },
    { ci: '34567895', name: 'Andrés Cabrera', email: 'andres.c@example.com', dob: '1994-12-04' },
    { ci: '34567896', name: 'Lucas Bentancur', email: 'lucas.b@example.com', dob: '2000-05-20' },
    // Atlético Norte (equipo 3)
    { ci: '45678900', name: 'Cristian Nández', email: 'cristian.n@example.com', dob: '1996-10-11' },
    { ci: '45678901', name: 'Mathías Corujo', email: 'mathias.co@example.com', dob: '1995-07-06' },
    { ci: '45678902', name: 'Fernando Muslera', email: 'fer.m@example.com', dob: '1997-04-23' },
    { ci: '45678903', name: 'Jonathan Urretavizcaya', email: 'jona.u@example.com', dob: '1998-09-15' },
    { ci: '45678904', name: 'Damián Suárez', email: 'damian.s@example.com', dob: '1999-01-27' },
    { ci: '45678905', name: 'Kevin Dawson', email: 'kevin.d@example.com', dob: '1994-11-19' },
    { ci: '45678906', name: 'Alfonso Trezza', email: 'alfonso.t@example.com', dob: '2001-03-08' },
    // Wanderers FC (equipo 4)
    { ci: '56789010', name: 'Camilo Cándido', email: 'camilo.c@example.com', dob: '1996-02-14' },
    { ci: '56789011', name: 'Mateo Ponte', email: 'mateo.p@example.com', dob: '1995-08-30' },
    { ci: '56789012', name: 'Facundo Torres', email: 'facu.t@example.com', dob: '1997-06-17' },
    { ci: '56789013', name: 'Agustín Álvarez', email: 'agus.a@example.com', dob: '1998-12-01' },
    { ci: '56789014', name: 'Brian Ocampo', email: 'brian.o@example.com', dob: '1999-04-25' },
    { ci: '56789015', name: 'Manuel Ugarte', email: 'manu.u@example.com', dob: '1994-05-13' },
    { ci: '56789016', name: 'Luciano Rodríguez', email: 'lucho.r@example.com', dob: '2002-07-09' },
    // Villa Española FC (equipo 5)
    { ci: '67890120', name: 'Enzo Borges', email: 'enzo.b@example.com', dob: '1996-09-21' },
    { ci: '67890121', name: 'Thiago Borbas', email: 'thiago.b@example.com', dob: '1995-01-10' },
    { ci: '67890122', name: 'Franco Israel', email: 'franco.i@example.com', dob: '1997-09-04' },
    { ci: '67890123', name: 'Santiago Bueno', email: 'santi.b@example.com', dob: '1998-06-29' },
    { ci: '67890124', name: 'Diego Rossi', email: 'diego.r@example.com', dob: '1999-03-16' },
    { ci: '67890125', name: 'Mauro Arambarri', email: 'mauro.a@example.com', dob: '1994-08-07' },
    { ci: '67890126', name: 'Fede Viñas', email: 'fede.v@example.com', dob: '2000-11-23' },
    // Real Pocitos (equipo 6)
    { ci: '78901230', name: 'Giorgian De Arrascaeta', email: 'giorgian.d@example.com', dob: '1994-06-01' },
    { ci: '78901231', name: 'José María Giménez', email: 'josema.g@example.com', dob: '1995-04-20' },
    { ci: '78901232', name: 'Nahitan Nández', email: 'nahitan.n@example.com', dob: '1996-12-28' },
    { ci: '78901233', name: 'Rodrigo Bentancur', email: 'rodrigo.b@example.com', dob: '1997-06-25' },
    { ci: '78901234', name: 'Darwin Núñez', email: 'darwin.n@example.com', dob: '1999-06-24' },
    { ci: '78901235', name: 'Ronald Araújo', email: 'ronald.a@example.com', dob: '1999-03-07' },
    { ci: '78901236', name: 'Fede Valverde', email: 'fede.val@example.com', dob: '1998-07-22' },
    // Cerro United (equipo 7)
    { ci: '89012340', name: 'Edinson Cavani Jr', email: 'edi.c@example.com', dob: '2000-02-14' },
    { ci: '89012341', name: 'Luis Suárez Jr', email: 'luis.sj@example.com', dob: '1997-01-24' },
    { ci: '89012342', name: 'Diego Forlán Jr', email: 'diego.fj@example.com', dob: '1998-05-19' },
    { ci: '89012343', name: 'Álvaro Recoba Jr', email: 'alvaro.rj@example.com', dob: '1996-03-17' },
    { ci: '89012344', name: 'Pablo García Jr', email: 'pablo.gj@example.com', dob: '1995-10-08' },
    { ci: '89012345', name: 'Carlos Sánchez', email: 'carlos.s@example.com', dob: '1994-04-02' },
    { ci: '89012346', name: 'Maxi Pereira Jr', email: 'maxi.pj@example.com', dob: '2001-08-15' },
  ];

  const players: any[] = [];
  for (const p of allPlayerData) {
    const user = await prisma.user.upsert({
      where: { email: p.email },
      update: {},
      create: {
        email: p.email,
        passwordHash: passwordHash,
        role: 'PLAYER',
        player: {
          create: {
            ci: p.ci,
            fullName: p.name,
            dateOfBirth: new Date(p.dob),
            identityStatus: Math.random() > 0.15 ? 'APPROVED' : 'PENDING',
            medicalClearances: {
              create: {
                documentUrl: '/uploads/medical/placeholder.pdf',
                issuedAt: daysAgo(randomInt(30, 180)),
                expiresAt: daysFromNow(randomInt(60, 300)),
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
  console.log(`✓ ${players.length} jugadores creados`);

  // ════════════════════════════════════════════════════════
  // 7. TEAMS (8 equipos)
  // ════════════════════════════════════════════════════════
  const teamNames = [
    'Los Celestes',
    'Los Rojinegros',
    'Deportivo Sur',
    'Atlético Norte',
    'Wanderers FC',
    'Villa Española FC',
    'Real Pocitos',
    'Cerro United',
  ];

  const teams: any[] = [];
  for (let t = 0; t < 8; t++) {
    const teamPlayers = players.slice(t * 7, t * 7 + 7);
    const team = await prisma.team.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name: teamNames[t] } },
      update: {},
      create: {
        tenantId: tenant.id,
        name: teamNames[t],
        captainPlayerId: teamPlayers[0].id,
      },
    });

    for (let i = 0; i < teamPlayers.length; i++) {
      await prisma.teamPlayer.upsert({
        where: { teamId_playerId: { teamId: team.id, playerId: teamPlayers[i].id } },
        update: {},
        create: { teamId: team.id, playerId: teamPlayers[i].id, shirtNumber: i + 1 },
      });
    }
    teams.push(team);
  }
  console.log(`✓ ${teams.length} equipos creados con planteles`);

  // ════════════════════════════════════════════════════════
  // 8. TOURNAMENT (IN_PROGRESS, 5 de 7 fechas jugadas)
  // ════════════════════════════════════════════════════════
  const tournament = await prisma.tournament.upsert({
    where: { id: 'demo-tournament' },
    update: {
      name: 'Torneo Apertura 2026',
      status: 'IN_PROGRESS',
      currentMatchday: 5,
      startDate: daysAgo(42),
    },
    create: {
      id: 'demo-tournament',
      tenantId: tenant.id,
      name: 'Torneo Apertura 2026',
      status: 'IN_PROGRESS',
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
      currentMatchday: 5,
      startDate: daysAgo(42),
    },
  });

  // Register all 8 teams
  for (const team of teams) {
    await prisma.tournamentTeam.upsert({
      where: { tournamentId_teamId: { tournamentId: tournament.id, teamId: team.id } },
      update: {},
      create: { tournamentId: tournament.id, teamId: team.id },
    });
  }
  console.log('✓ Torneo Apertura 2026 (EN CURSO, fecha 5 de 7)');

  // ════════════════════════════════════════════════════════
  // 9. FIXTURE (round-robin for 8 teams = 7 matchdays)
  // ════════════════════════════════════════════════════════
  // Standard round-robin pairing for 8 teams
  const roundRobin: [number, number][][] = [
    [[0, 7], [1, 6], [2, 5], [3, 4]], // Fecha 1
    [[7, 4], [5, 3], [6, 2], [0, 1]], // Fecha 2
    [[1, 7], [2, 0], [3, 6], [4, 5]], // Fecha 3
    [[7, 5], [6, 4], [0, 3], [1, 2]], // Fecha 4
    [[2, 7], [3, 1], [4, 0], [5, 6]], // Fecha 5
    [[7, 6], [0, 5], [1, 4], [2, 3]], // Fecha 6
    [[3, 7], [4, 2], [5, 1], [6, 0]], // Fecha 7
  ];

  // Pre-defined realistic scores for the 5 played matchdays (20 matches)
  const scores: [number, number][] = [
    // Fecha 1
    [2, 1], [3, 3], [1, 0], [4, 2],
    // Fecha 2
    [0, 1], [2, 2], [1, 3], [2, 0],
    // Fecha 3
    [1, 1], [3, 1], [0, 2], [2, 1],
    // Fecha 4
    [4, 0], [1, 2], [3, 1], [0, 0],
    // Fecha 5
    [2, 3], [1, 0], [2, 2], [1, 4],
  ];

  const venues = [venue1, venue2];
  const allMatches: any[] = [];
  let scoreIdx = 0;

  for (let md = 0; md < 7; md++) {
    const matchday = md + 1;
    const pairings = roundRobin[md];

    for (let g = 0; g < pairings.length; g++) {
      const [homeIdx, awayIdx] = pairings[g];
      const isPlayed = matchday <= 5;

      const scheduledAt = isPlayed
        ? daysAgo((5 - md) * 7 + (3 - g)) // Spread across weeks
        : daysFromNow((md - 5) * 7 + g + 3);

      const matchData: any = {
        tournamentId: tournament.id,
        matchday,
        homeTeamId: teams[homeIdx].id,
        awayTeamId: teams[awayIdx].id,
        venueId: venues[g % 2].id,
        refereeId: referee.id,
        scheduledAt,
        status: isPlayed ? 'COMPLETED' : 'SCHEDULED',
      };

      if (isPlayed) {
        const [hs, as] = scores[scoreIdx++];
        matchData.homeScore = hs;
        matchData.awayScore = as;
        matchData.homeFairPlay = +(3 + Math.random() * 2).toFixed(1);
        matchData.awayFairPlay = +(3 + Math.random() * 2).toFixed(1);
      }

      const match = await prisma.match.create({ data: matchData });
      allMatches.push({
        ...match,
        homeIdx,
        awayIdx,
        isPlayed,
      });
    }
  }
  console.log(`✓ ${allMatches.length} partidos creados (${allMatches.filter(m => m.isPlayed).length} jugados)`);

  // ════════════════════════════════════════════════════════
  // 10. MATCH EVENTS (Lineups, Goals, Cards for played matches)
  // ════════════════════════════════════════════════════════
  const sanctionsToCreate: any[] = [];

  for (const match of allMatches.filter(m => m.isPlayed)) {
    const homePlayers = players.slice(match.homeIdx * 7, match.homeIdx * 7 + 7);
    const awayPlayers = players.slice(match.awayIdx * 7, match.awayIdx * 7 + 7);
    const homeStarters = homePlayers.slice(0, 5);
    const awayStarters = awayPlayers.slice(0, 5);

    // Lineups
    for (const p of homeStarters) {
      await prisma.matchLineup.create({
        data: { matchId: match.id, playerId: p.id, teamId: teams[match.homeIdx].id, isStarter: true },
      });
    }
    for (const p of awayStarters) {
      await prisma.matchLineup.create({
        data: { matchId: match.id, playerId: p.id, teamId: teams[match.awayIdx].id, isStarter: true },
      });
    }

    // Goals
    for (let g = 0; g < (match.homeScore || 0); g++) {
      const scorer = pick(homeStarters);
      const assister = homeStarters.find(p => p.id !== scorer.id) || null;
      await prisma.goal.create({
        data: {
          matchId: match.id,
          playerId: scorer.id,
          assistPlayerId: Math.random() > 0.4 ? assister?.id : null,
          teamId: teams[match.homeIdx].id,
          minute: randomInt(1, 50),
        },
      });
    }
    for (let g = 0; g < (match.awayScore || 0); g++) {
      const scorer = pick(awayStarters);
      const assister = awayStarters.find(p => p.id !== scorer.id) || null;
      await prisma.goal.create({
        data: {
          matchId: match.id,
          playerId: scorer.id,
          assistPlayerId: Math.random() > 0.4 ? assister?.id : null,
          teamId: teams[match.awayIdx].id,
          minute: randomInt(1, 50),
        },
      });
    }

    // Cards (random, ~30% chance per match to have a card)
    const cardReasons = [
      'Falta táctica', 'Juego brusco', 'Protesta reiterada',
      'Retardar el juego', 'Entrada fuerte', 'Mano intencional',
      'Simulación', 'Conducta antideportiva',
    ];

    // Home team cards
    if (Math.random() > 0.3) {
      const recipient = pick(homeStarters);
      const isRed = Math.random() > 0.85;
      await prisma.card.create({
        data: {
          matchId: match.id,
          playerId: recipient.id,
          teamId: teams[match.homeIdx].id,
          type: isRed ? 'RED' : 'YELLOW',
          minute: randomInt(5, 48),
          reason: pick(cardReasons),
        },
      });

      // Second yellow for same player (double yellow = sanction)
      if (!isRed && Math.random() > 0.6) {
        await prisma.card.create({
          data: {
            matchId: match.id,
            playerId: recipient.id,
            teamId: teams[match.homeIdx].id,
            type: 'YELLOW',
            minute: randomInt(30, 50),
            reason: pick(cardReasons),
          },
        });
        // Auto sanction for double yellow
        sanctionsToCreate.push({
          tenantId: tenant.id,
          playerId: recipient.id,
          matchId: match.id,
          severity: 'LIGHT' as const,
          status: 'AUTO_APPLIED' as const,
          reason: `Doble amarilla vs ${teamNames[match.awayIdx]} (Fecha ${match.matchday})`,
          matchesSuspended: 1,
          matchesServed: match.matchday < 5 ? 1 : 0,
          isActive: match.matchday >= 5,
        });
      }

      // Red card = grave sanction pending tribunal
      if (isRed) {
        sanctionsToCreate.push({
          tenantId: tenant.id,
          playerId: recipient.id,
          matchId: match.id,
          severity: 'GRAVE' as const,
          status: match.matchday < 4 ? 'RESOLVED' as const : 'PENDING_TRIBUNAL' as const,
          reason: `Roja directa vs ${teamNames[match.awayIdx]} (Fecha ${match.matchday}) - ${pick(cardReasons)}`,
          matchesSuspended: match.matchday < 4 ? 3 : 0,
          matchesServed: match.matchday < 4 ? Math.min(3, 5 - match.matchday) : 0,
          isActive: match.matchday >= 3,
          tribunalNotes: match.matchday < 4 ? 'Tribunal resolvió 3 fechas de suspensión.' : null,
          resolvedAt: match.matchday < 4 ? daysAgo(20) : null,
        });
      }
    }

    // Away team cards
    if (Math.random() > 0.35) {
      const recipient = pick(awayStarters);
      await prisma.card.create({
        data: {
          matchId: match.id,
          playerId: recipient.id,
          teamId: teams[match.awayIdx].id,
          type: 'YELLOW',
          minute: randomInt(10, 45),
          reason: pick(cardReasons),
        },
      });
    }
  }

  // Create sanctions
  for (const s of sanctionsToCreate) {
    await prisma.sanction.create({ data: s });
  }
  console.log(`✓ Eventos de partidos creados (goles, tarjetas, planillas)`);
  console.log(`✓ ${sanctionsToCreate.length} sanciones generadas`);

  // ════════════════════════════════════════════════════════
  // 11. UPDATE STANDINGS (based on match results)
  // ════════════════════════════════════════════════════════
  for (const match of allMatches.filter(m => m.isPlayed)) {
    const hs = match.homeScore ?? 0;
    const as = match.awayScore ?? 0;
    let homePoints = 0;
    let awayPoints = 0;
    let homeW = 0, homeD = 0, homeL = 0;
    let awayW = 0, awayD = 0, awayL = 0;

    if (hs > as) { homePoints = 3; homeW = 1; awayL = 1; }
    else if (hs < as) { awayPoints = 3; awayW = 1; homeL = 1; }
    else { homePoints = 1; awayPoints = 1; homeD = 1; awayD = 1; }

    await prisma.tournamentTeam.update({
      where: { tournamentId_teamId: { tournamentId: tournament.id, teamId: teams[match.homeIdx].id } },
      data: {
        played: { increment: 1 },
        won: { increment: homeW },
        drawn: { increment: homeD },
        lost: { increment: homeL },
        goalsFor: { increment: hs },
        goalsAgainst: { increment: as },
        points: { increment: homePoints },
        fairPlaySum: { increment: match.homeFairPlay || 0 },
        fairPlayCount: { increment: 1 },
      },
    });
    await prisma.tournamentTeam.update({
      where: { tournamentId_teamId: { tournamentId: tournament.id, teamId: teams[match.awayIdx].id } },
      data: {
        played: { increment: 1 },
        won: { increment: awayW },
        drawn: { increment: awayD },
        lost: { increment: awayL },
        goalsFor: { increment: as },
        goalsAgainst: { increment: hs },
        points: { increment: awayPoints },
        fairPlaySum: { increment: match.awayFairPlay || 0 },
        fairPlayCount: { increment: 1 },
      },
    });
  }
  console.log('✓ Tabla de posiciones actualizada');

  // ════════════════════════════════════════════════════════
  // 12. PAYMENT ORDERS (cuotas + señas)
  // ════════════════════════════════════════════════════════
  const cuotaAmount = 1500; // UYU por equipo por fecha

  // Deposit orders (seña del torneo)
  for (const team of teams) {
    const isPaid = Math.random() > 0.15;
    await prisma.paymentOrder.create({
      data: {
        tenantId: tenant.id,
        teamId: team.id,
        tournamentId: tournament.id,
        amount: 2000,
        currency: 'UYU',
        status: isPaid ? 'PAID' : 'OVERDUE',
        isDeposit: true,
        description: 'Seña inscripción Torneo Apertura 2026',
        dueDate: daysAgo(45),
        paidAt: isPaid ? daysAgo(randomInt(40, 44)) : null,
        externalPaymentId: isPaid ? `mp_dep_${team.id.slice(-6)}` : null,
        gatewayFee: isPaid ? 2000 * 0.035 : null,
        aufaCommission: isPaid ? 2000 * 0.04 : null,
        leagueAmount: isPaid ? 2000 * (1 - 0.035 - 0.04) : null,
      },
    });
  }

  // Per-matchday payment orders
  for (let md = 1; md <= 5; md++) {
    const mdMatches = allMatches.filter(m => m.matchday === md);
    for (const match of mdMatches) {
      for (const teamIdx of [match.homeIdx, match.awayIdx]) {
        const isPaid = md <= 4 ? (Math.random() > 0.1) : (Math.random() > 0.35);
        const isOverdue = !isPaid && md <= 3;
        const status = isPaid ? 'PAID' : isOverdue ? 'OVERDUE' : 'PENDING';

        await prisma.paymentOrder.create({
          data: {
            tenantId: tenant.id,
            teamId: teams[teamIdx].id,
            tournamentId: tournament.id,
            matchId: match.id,
            amount: cuotaAmount,
            currency: 'UYU',
            status,
            isDeposit: false,
            description: `Cuota Fecha ${md}`,
            dueDate: daysAgo((5 - md) * 7 + 2),
            paidAt: isPaid ? daysAgo((5 - md) * 7 + randomInt(0, 1)) : null,
            externalPaymentId: isPaid ? `mp_f${md}_${teams[teamIdx].id.slice(-6)}` : null,
            gatewayFee: isPaid ? cuotaAmount * 0.035 : null,
            aufaCommission: isPaid ? cuotaAmount * 0.04 : null,
            leagueAmount: isPaid ? cuotaAmount * (1 - 0.035 - 0.04) : null,
          },
        });
      }
    }
  }

  // Future matchday orders (Fecha 6 - upcoming)
  const mdMatches6 = allMatches.filter(m => m.matchday === 6);
  for (const match of mdMatches6) {
    for (const teamIdx of [match.homeIdx, match.awayIdx]) {
      await prisma.paymentOrder.create({
        data: {
          tenantId: tenant.id,
          teamId: teams[teamIdx].id,
          tournamentId: tournament.id,
          matchId: match.id,
          amount: cuotaAmount,
          currency: 'UYU',
          status: 'PENDING',
          isDeposit: false,
          description: 'Cuota Fecha 6',
          dueDate: daysFromNow(5),
        },
      });
    }
  }

  const orderCount = await prisma.paymentOrder.count({ where: { tenantId: tenant.id } });
  const paidCount = await prisma.paymentOrder.count({ where: { tenantId: tenant.id, status: 'PAID' } });
  const pendingCount = await prisma.paymentOrder.count({ where: { tenantId: tenant.id, status: 'PENDING' } });
  const overdueCount = await prisma.paymentOrder.count({ where: { tenantId: tenant.id, status: 'OVERDUE' } });
  console.log(`✓ ${orderCount} órdenes de pago (${paidCount} pagadas, ${pendingCount} pendientes, ${overdueCount} vencidas)`);

  // ════════════════════════════════════════════════════════
  // 13. SUBSCRIPTION INVOICE (for the tenant)
  // ════════════════════════════════════════════════════════
  await prisma.subscriptionInvoice.create({
    data: {
      tenantId: tenant.id,
      amount: 29.99,
      currency: 'USD',
      period: '2026-01',
      status: 'PAID',
      dueDate: daysAgo(30),
      paidAt: daysAgo(28),
    },
  });
  await prisma.subscriptionInvoice.create({
    data: {
      tenantId: tenant.id,
      amount: 29.99,
      currency: 'USD',
      period: '2026-02',
      status: 'PENDING',
      dueDate: daysFromNow(10),
    },
  });
  console.log('✓ Facturas de suscripción creadas');

  // ════════════════════════════════════════════════════════
  // DONE
  // ════════════════════════════════════════════════════════
  console.log('\n════════════════════════════════════════════');
  console.log('🏆 Seed completado exitosamente!');
  console.log('════════════════════════════════════════════');
  console.log('\nCredenciales de prueba:');
  console.log('  Super Admin:  admin@aufa.uy / admin123');
  console.log('  Organizador:  organizador@ligademo.uy / liga123');
  console.log('  Jugador:      martin@example.com / player123');
  console.log('  Jugador CI:   12345678 / player123');
  console.log('  Árbitro:      arbitro@aufa.uy / admin123');
  console.log('\nDatos:');
  console.log(`  ${teams.length} equipos con ${players.length} jugadores`);
  console.log('  1 torneo en curso (fecha 5 de 7)');
  console.log(`  ${allMatches.filter(m => m.isPlayed).length} partidos jugados con goles y tarjetas`);
  console.log(`  ${orderCount} órdenes de pago`);
  console.log(`  ${sanctionsToCreate.length} sanciones`);
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
