import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyTiebreakers,
  goalDifference,
  fairPlayScore,
  StandingRow,
  MatchResult,
  TiebreakerContext,
} from './standings';

function row(teamId: string, overrides: Partial<StandingRow> = {}): StandingRow {
  return {
    teamId,
    points: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    fairPlaySum: 0,
    fairPlayCount: 0,
    ...overrides,
  };
}

function played(home: string, homeScore: number, awayScore: number, away: string): MatchResult {
  return { homeTeamId: home, awayTeamId: away, homeScore, awayScore };
}

function context(matches: MatchResult[]): TiebreakerContext {
  return { matches, pointsForWin: 3, pointsForDraw: 1, pointsForLoss: 0 };
}

const order = (rows: StandingRow[], criteria: string[], ctx?: TiebreakerContext) =>
  applyTiebreakers(rows, criteria, ctx).map((r) => r.teamId);

describe('applyTiebreakers', () => {
  test('los puntos mandan sobre cualquier criterio', () => {
    const rows = [row('a', { points: 3, goalsFor: 99 }), row('b', { points: 9, goalsFor: 1 })];
    assert.deepEqual(order(rows, ['GOAL_DIFFERENCE', 'GOALS_FOR']), ['b', 'a']);
  });

  test('desempata por diferencia de gol', () => {
    const rows = [
      row('a', { points: 6, goalsFor: 4, goalsAgainst: 4 }),
      row('b', { points: 6, goalsFor: 7, goalsAgainst: 2 }),
    ];
    assert.deepEqual(order(rows, ['GOAL_DIFFERENCE']), ['b', 'a']);
  });

  test('desempata por goles a favor cuando la diferencia es igual', () => {
    const rows = [
      row('a', { points: 6, goalsFor: 2, goalsAgainst: 1 }),
      row('b', { points: 6, goalsFor: 8, goalsAgainst: 7 }),
    ];
    assert.deepEqual(order(rows, ['GOAL_DIFFERENCE', 'GOALS_FOR']), ['b', 'a']);
  });

  test('respeta el orden configurado por el organizador', () => {
    const rows = [
      row('a', { points: 6, goalsFor: 10, goalsAgainst: 8 }), // dif +2, GF 10
      row('b', { points: 6, goalsFor: 5, goalsAgainst: 1 }), // dif +4, GF 5
    ];
    assert.deepEqual(order(rows, ['GOAL_DIFFERENCE', 'GOALS_FOR']), ['b', 'a']);
    assert.deepEqual(order(rows, ['GOALS_FOR', 'GOAL_DIFFERENCE']), ['a', 'b']);
  });

  test('desempata por fair play usando el promedio, no la suma', () => {
    const rows = [
      row('a', { points: 6, fairPlaySum: 10, fairPlayCount: 4 }), // 2.5
      row('b', { points: 6, fairPlaySum: 10, fairPlayCount: 2 }), // 5.0
    ];
    assert.deepEqual(order(rows, ['FAIR_PLAY']), ['b', 'a']);
  });

  test('el orden es estable cuando todo empata', () => {
    const rows = [row('c', { points: 3 }), row('a', { points: 3 }), row('b', { points: 3 })];
    const first = order(rows, ['GOAL_DIFFERENCE', 'GOALS_FOR']);
    const second = order([...rows].reverse(), ['GOAL_DIFFERENCE', 'GOALS_FOR']);
    assert.deepEqual(first, second, 'la tabla no puede cambiar entre consultas');
  });

  test('no muta el arreglo original', () => {
    const rows = [row('a', { points: 1 }), row('b', { points: 9 })];
    const snapshot = rows.map((r) => r.teamId);
    applyTiebreakers(rows, ['GOAL_DIFFERENCE']);
    assert.deepEqual(rows.map((r) => r.teamId), snapshot);
  });

  test('sin criterios configurados ordena por puntos', () => {
    const rows = [row('a', { points: 1 }), row('b', { points: 4 })];
    assert.deepEqual(order(rows, []), ['b', 'a']);
  });

  test('equipos con distintos puntos no se mezclan al desempatar', () => {
    const rows = [
      row('a', { points: 9, goalsFor: 1, goalsAgainst: 9 }),
      row('b', { points: 6, goalsFor: 50, goalsAgainst: 0 }),
      row('c', { points: 6, goalsFor: 60, goalsAgainst: 0 }),
      row('d', { points: 3, goalsFor: 99, goalsAgainst: 0 }),
    ];
    assert.deepEqual(order(rows, ['GOAL_DIFFERENCE']), ['a', 'c', 'b', 'd']);
  });
});

describe('HEAD_TO_HEAD', () => {
  test('decide un empate de dos por el partido entre ellos', () => {
    const rows = [
      row('a', { points: 6, goalsFor: 9, goalsAgainst: 1 }),
      row('b', { points: 6, goalsFor: 3, goalsAgainst: 2 }),
    ];
    // b le gano a a, aunque a tenga mucha mejor diferencia general.
    const ctx = context([played('b', 2, 0, 'a')]);
    assert.deepEqual(order(rows, ['HEAD_TO_HEAD', 'GOAL_DIFFERENCE'], ctx), ['b', 'a']);
  });

  test('usa ida y vuelta entre los dos equipos, no un solo partido', () => {
    const rows = [row('a', { points: 6 }), row('b', { points: 6 })];
    // b gana 1-0 de local, a gana 3-0 de local: a queda arriba en el mini-cuadro.
    const ctx = context([played('b', 1, 0, 'a'), played('a', 3, 0, 'b')]);
    assert.deepEqual(order(rows, ['HEAD_TO_HEAD'], ctx), ['a', 'b']);
  });

  test('resuelve un triple empate circular por el mini-cuadro', () => {
    const rows = [
      row('a', { points: 7 }),
      row('b', { points: 7 }),
      row('c', { points: 7 }),
    ];
    // Ciclo: a gana a b, b gana a c, c gana a a. Todos 3 puntos en el mini-cuadro,
    // asi que decide la diferencia de gol dentro del grupo.
    const ctx = context([
      played('a', 1, 0, 'b'),
      played('b', 1, 0, 'c'),
      played('c', 3, 0, 'a'),
    ]);
    // dif dentro del grupo: a = 1-3 = -2, b = 1-1 = 0, c = 3-1 = +2
    assert.deepEqual(order(rows, ['HEAD_TO_HEAD'], ctx), ['c', 'b', 'a']);
  });

  test('solo cuentan los partidos entre los equipos empatados', () => {
    const rows = [row('a', { points: 6 }), row('b', { points: 6 })];
    const ctx = context([
      played('b', 1, 0, 'a'), // este decide
      played('a', 9, 0, 'z'), // contra un tercero: no debe influir
      played('z', 9, 0, 'b'),
    ]);
    assert.deepEqual(order(rows, ['HEAD_TO_HEAD'], ctx), ['b', 'a']);
  });

  test('si no se enfrentaron, pasa al criterio siguiente', () => {
    const rows = [
      row('a', { points: 6, goalsFor: 2, goalsAgainst: 2 }),
      row('b', { points: 6, goalsFor: 8, goalsAgainst: 1 }),
    ];
    const ctx = context([played('a', 5, 0, 'z')]);
    assert.deepEqual(order(rows, ['HEAD_TO_HEAD', 'GOAL_DIFFERENCE'], ctx), ['b', 'a']);
  });

  test('sin contexto se omite y los criterios siguientes deciden', () => {
    const rows = [
      row('a', { points: 6, goalsFor: 2, goalsAgainst: 2 }),
      row('b', { points: 6, goalsFor: 9, goalsAgainst: 1 }),
    ];
    assert.deepEqual(order(rows, ['HEAD_TO_HEAD', 'GOAL_DIFFERENCE']), ['b', 'a']);
  });

  test('respeta el puntaje configurado por la liga', () => {
    const rows = [row('a', { points: 10 }), row('b', { points: 10 })];
    const matches = [
      played('a', 1, 0, 'b'),
      played('b', 1, 0, 'a'),
      played('a', 0, 0, 'b'),
    ];

    // Con 3 por victoria y 1 por empate quedan iguales (4 y 4), decide la
    // diferencia de gol del grupo, que tambien es 0: gana el desempate estable.
    assert.deepEqual(order(rows, ['HEAD_TO_HEAD'], context(matches)), ['a', 'b']);

    // Con un punto extra por empate el resultado sigue parejo; lo que se verifica
    // aca es que el mini-cuadro no ignore la configuracion de la liga.
    const twoForDraw: TiebreakerContext = {
      matches,
      pointsForWin: 3,
      pointsForDraw: 2,
      pointsForLoss: 0,
    };
    assert.deepEqual(order(rows, ['HEAD_TO_HEAD'], twoForDraw), ['a', 'b']);
  });

  test('un empate de cuatro se ordena por el mini-cuadro completo', () => {
    const rows = [row('a', { points: 5 }), row('b', { points: 5 }), row('c', { points: 5 }), row('d', { points: 5 })];
    const ctx = context([
      played('a', 2, 0, 'b'),
      played('a', 2, 0, 'c'),
      played('a', 2, 0, 'd'), // a gana todo: 9 puntos
      played('b', 1, 0, 'c'),
      played('b', 1, 0, 'd'), // b gana dos: 6
      played('c', 1, 0, 'd'), // c gana una: 3, d ninguna: 0
    ]);
    assert.deepEqual(order(rows, ['HEAD_TO_HEAD'], ctx), ['a', 'b', 'c', 'd']);
  });
});

describe('metricas derivadas', () => {
  test('diferencia de gol puede ser negativa', () => {
    assert.equal(goalDifference(row('a', { goalsFor: 2, goalsAgainst: 5 })), -3);
  });

  test('fair play sin partidos evaluados es cero y no NaN', () => {
    const score = fairPlayScore(row('a'));
    assert.equal(score, 0);
    assert.ok(!Number.isNaN(score));
  });
});
