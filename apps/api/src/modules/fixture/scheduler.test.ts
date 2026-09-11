import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { scheduleMatches, VenueSlot } from './scheduler';
import { buildPairings } from './round-robin';

// Local midnight on a known Monday, so dayOfWeek arithmetic is unambiguous.
const MONDAY = new Date(2026, 0, 5);
const MON = 1;
const WED = 3;

const teamsOf = (n: number) => Array.from({ length: n }, (_, i) => `t${i + 1}`);

const slot = (venueId: string, dayOfWeek: number, startTime: string): VenueSlot => ({
  venueId,
  dayOfWeek,
  startTime,
});

describe('scheduleMatches', () => {
  test('sin canchas cargadas no programa nada y explica por que', () => {
    const { scheduled, unscheduled } = scheduleMatches({
      pairings: buildPairings(teamsOf(4), false),
      slots: [],
      startDate: MONDAY,
    });

    assert.equal(scheduled.length, 0);
    assert.equal(unscheduled.length, 6);
    assert.match(unscheduled[0].reason, /canchas/i);
  });

  test('con horarios suficientes programa todos los partidos', () => {
    const { scheduled, unscheduled } = scheduleMatches({
      pairings: buildPairings(teamsOf(4), false),
      slots: [slot('v1', MON, '20:00'), slot('v1', MON, '21:00'), slot('v2', MON, '20:00')],
      startDate: MONDAY,
    });

    assert.equal(unscheduled.length, 0);
    assert.equal(scheduled.length, 6);
  });

  test('nunca pone dos partidos en la misma cancha a la misma hora', () => {
    const { scheduled } = scheduleMatches({
      pairings: buildPairings(teamsOf(8), false),
      slots: [slot('v1', MON, '20:00'), slot('v1', MON, '21:00'), slot('v2', MON, '20:00'), slot('v2', MON, '21:00')],
      startDate: MONDAY,
    });

    const seen = new Set<string>();
    for (const m of scheduled) {
      const key = `${m.venueId}@${m.scheduledAt.getTime()}`;
      assert.ok(!seen.has(key), `cancha ocupada dos veces: ${key}`);
      seen.add(key);
    }
  });

  test('nunca pone a un equipo en dos partidos simultaneos', () => {
    const { scheduled } = scheduleMatches({
      pairings: buildPairings(teamsOf(8), true),
      slots: [slot('v1', MON, '20:00'), slot('v2', MON, '20:00'), slot('v1', MON, '21:30'), slot('v2', MON, '21:30')],
      startDate: MONDAY,
    });

    const seen = new Set<string>();
    for (const m of scheduled) {
      for (const team of [m.homeTeamId, m.awayTeamId]) {
        const key = `${team}@${m.scheduledAt.getTime()}`;
        assert.ok(!seen.has(key), `${team} juega dos veces a la vez`);
        seen.add(key);
      }
    }
  });

  test('respeta los dias en que un equipo puede jugar', () => {
    const { scheduled, unscheduled } = scheduleMatches({
      pairings: buildPairings(teamsOf(4), false),
      slots: [slot('v1', MON, '20:00'), slot('v1', WED, '20:00'), slot('v2', WED, '21:00')],
      startDate: MONDAY,
      restrictions: [{ teamId: 't1', availableDays: [WED] }],
    });

    assert.equal(unscheduled.length, 0, 'deberia poder acomodar todo');
    for (const m of scheduled) {
      if (m.homeTeamId === 't1' || m.awayTeamId === 't1') {
        assert.equal(m.scheduledAt.getDay(), WED, 't1 quedo fuera de su dia');
      }
    }
  });

  test('respeta la hora minima de un equipo', () => {
    const { scheduled } = scheduleMatches({
      pairings: buildPairings(teamsOf(4), false),
      slots: [slot('v1', MON, '18:00'), slot('v1', MON, '21:00'), slot('v2', MON, '21:00'), slot('v2', MON, '18:00')],
      startDate: MONDAY,
      restrictions: [{ teamId: 't2', earliestTime: '21:00' }],
    });

    for (const m of scheduled) {
      if (m.homeTeamId === 't2' || m.awayTeamId === 't2') {
        assert.ok(m.scheduledAt.getHours() >= 21, 't2 quedo antes de su hora minima');
      }
    }
  });

  test('un partido imposible se reporta en vez de desaparecer', () => {
    const pairings = buildPairings(teamsOf(4), false);
    const { scheduled, unscheduled } = scheduleMatches({
      pairings,
      slots: [slot('v1', MON, '20:00'), slot('v1', MON, '21:00'), slot('v2', MON, '20:00')],
      startDate: MONDAY,
      // t1 only plays Wednesdays, but no venue opens on a Wednesday.
      restrictions: [{ teamId: 't1', availableDays: [WED] }],
    });

    const total = pairings.flat().length;
    assert.equal(scheduled.length + unscheduled.length, total, 'se perdieron partidos');
    assert.equal(unscheduled.length, 3, 't1 juega 3 partidos y ninguno es ubicable');
    for (const m of unscheduled) {
      assert.ok(m.homeTeamId === 't1' || m.awayTeamId === 't1');
      assert.match(m.reason, /restricciones/i);
    }
  });

  test('ningun partido se pierde, se programe o no', () => {
    const pairings = buildPairings(teamsOf(6), true);
    const { scheduled, unscheduled } = scheduleMatches({
      pairings,
      slots: [slot('v1', MON, '20:00')],
      startDate: MONDAY,
    });

    assert.equal(scheduled.length + unscheduled.length, pairings.flat().length);
    assert.ok(unscheduled.length > 0, 'una sola cancha no alcanza para 3 partidos por fecha');
    assert.match(unscheduled[0].reason, /ocupados/i);
  });

  test('cada fecha cae en su propia semana', () => {
    const { scheduled } = scheduleMatches({
      pairings: buildPairings(teamsOf(4), false),
      slots: [slot('v1', MON, '20:00'), slot('v2', MON, '20:00')],
      startDate: MONDAY,
    });

    const byMatchday = new Map<number, Date[]>();
    for (const m of scheduled) {
      byMatchday.set(m.matchday, [...(byMatchday.get(m.matchday) ?? []), m.scheduledAt]);
    }

    for (const [matchday, dates] of byMatchday) {
      for (const date of dates) {
        const daysFromStart = Math.floor((date.getTime() - MONDAY.getTime()) / 86_400_000);
        assert.ok(
          daysFromStart >= (matchday - 1) * 7 && daysFromStart < matchday * 7,
          `fecha ${matchday} cayo fuera de su semana`
        );
      }
    }
  });

  test('la fecha de inicio no arrastra la hora del partido', () => {
    const { scheduled } = scheduleMatches({
      pairings: buildPairings(teamsOf(4), false),
      // Start date carries a time of day that must not leak into kick-off.
      startDate: new Date(2026, 0, 5, 13, 47),
      slots: [slot('v1', MON, '20:00'), slot('v2', MON, '20:00')],
    });

    for (const m of scheduled) {
      assert.equal(m.scheduledAt.getHours(), 20);
      assert.equal(m.scheduledAt.getMinutes(), 0);
    }
  });
});
