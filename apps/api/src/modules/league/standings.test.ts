import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { applyTiebreakers, goalDifference, fairPlayScore, StandingRow } from './standings';

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

const order = (rows: StandingRow[], criteria: string[]) =>
  applyTiebreakers(rows, criteria).map((r) => r.teamId);

describe('applyTiebreakers', () => {
  test('los puntos mandan sobre cualquier criterio', () => {
    const rows = [
      row('a', { points: 3, goalsFor: 99 }),
      row('b', { points: 9, goalsFor: 1 }),
    ];
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

    // Goal difference first puts b on top; goals for first puts a on top.
    assert.deepEqual(order(rows, ['GOAL_DIFFERENCE', 'GOALS_FOR']), ['b', 'a']);
    assert.deepEqual(order(rows, ['GOALS_FOR', 'GOAL_DIFFERENCE']), ['a', 'b']);
  });

  test('desempata por fair play usando el promedio, no la suma', () => {
    const rows = [
      // Same total, different number of matches: b averages higher.
      row('a', { points: 6, fairPlaySum: 10, fairPlayCount: 4 }), // 2.5
      row('b', { points: 6, fairPlaySum: 10, fairPlayCount: 2 }), // 5.0
    ];
    assert.deepEqual(order(rows, ['FAIR_PLAY']), ['b', 'a']);
  });

  test('HEAD_TO_HEAD no bloquea los criterios siguientes', () => {
    const rows = [
      row('a', { points: 6, goalsFor: 2, goalsAgainst: 2 }),
      row('b', { points: 6, goalsFor: 9, goalsAgainst: 1 }),
    ];
    // Head-to-head cannot be decided from this table; goal difference still must.
    assert.deepEqual(order(rows, ['HEAD_TO_HEAD', 'GOAL_DIFFERENCE']), ['b', 'a']);
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
