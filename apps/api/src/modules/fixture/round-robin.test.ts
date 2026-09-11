import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { generateRounds, assignHomeAway, buildPairings } from './round-robin';

const teamsOf = (n: number) => Array.from({ length: n }, (_, i) => `t${i + 1}`);

describe('generateRounds', () => {
  for (const n of [2, 4, 6, 8, 12]) {
    test(`${n} equipos: cada par se enfrenta exactamente una vez`, () => {
      const rounds = generateRounds(teamsOf(n));
      const seen = new Map<string, number>();

      for (const round of rounds) {
        for (const [a, b] of round) {
          const key = [a, b].sort().join('|');
          seen.set(key, (seen.get(key) ?? 0) + 1);
        }
      }

      assert.equal(seen.size, (n * (n - 1)) / 2, 'faltan enfrentamientos');
      for (const [pair, count] of seen) {
        assert.equal(count, 1, `${pair} se repite`);
      }
    });

    test(`${n} equipos: nadie juega dos veces en la misma fecha`, () => {
      for (const round of generateRounds(teamsOf(n))) {
        const playing = round.flat();
        assert.equal(new Set(playing).size, playing.length, 'un equipo aparece dos veces');
      }
    });

    test(`${n} equipos: todos juegan ${n - 1} partidos`, () => {
      const played = new Map<string, number>();
      for (const round of generateRounds(teamsOf(n))) {
        for (const [a, b] of round) {
          played.set(a, (played.get(a) ?? 0) + 1);
          played.set(b, (played.get(b) ?? 0) + 1);
        }
      }
      for (const team of teamsOf(n)) {
        assert.equal(played.get(team), n - 1, `${team} juega de menos o de mas`);
      }
    });
  }

  test('numero impar de equipos: uno descansa por fecha y el resto juega', () => {
    const rounds = generateRounds(teamsOf(5));
    assert.equal(rounds.length, 5, 'deben ser 5 fechas');
    for (const round of rounds) {
      assert.equal(round.length, 2, 'dos partidos por fecha con 5 equipos');
    }

    const played = new Map<string, number>();
    for (const round of rounds) {
      for (const [a, b] of round) {
        played.set(a, (played.get(a) ?? 0) + 1);
        played.set(b, (played.get(b) ?? 0) + 1);
      }
    }
    for (const team of teamsOf(5)) {
      assert.equal(played.get(team), 4);
    }
  });

  test('menos de dos equipos no genera fechas', () => {
    assert.deepEqual(generateRounds([]), []);
    assert.deepEqual(generateRounds(['solo']), []);
  });

  test('ningun equipo se enfrenta a si mismo', () => {
    for (const round of generateRounds(teamsOf(8))) {
      for (const [a, b] of round) {
        assert.notEqual(a, b);
      }
    }
  });
});

describe('assignHomeAway', () => {
  test('reparte la localia de forma pareja', () => {
    const pairings = assignHomeAway(generateRounds(teamsOf(8)));

    const homeCount = new Map<string, number>();
    for (const round of pairings) {
      for (const { homeTeamId } of round) {
        homeCount.set(homeTeamId, (homeCount.get(homeTeamId) ?? 0) + 1);
      }
    }

    // With 7 rounds a team plays home 3 or 4 times; nobody should sit outside that.
    for (const team of teamsOf(8)) {
      const count = homeCount.get(team) ?? 0;
      assert.ok(count >= 3 && count <= 4, `${team} es local ${count} veces`);
    }
  });

  test('no cambia los enfrentamientos, solo su orientacion', () => {
    const rounds = generateRounds(teamsOf(6));
    const pairings = assignHomeAway(rounds);

    const original = rounds.flat().map(([a, b]) => [a, b].sort().join('|')).sort();
    const oriented = pairings
      .flat()
      .map(({ homeTeamId, awayTeamId }) => [homeTeamId, awayTeamId].sort().join('|'))
      .sort();

    assert.deepEqual(oriented, original);
  });
});

describe('buildPairings', () => {
  test('ida y vuelta duplica las fechas e invierte la localia', () => {
    const single = buildPairings(teamsOf(4), false);
    const double = buildPairings(teamsOf(4), true);

    assert.equal(single.length, 3);
    assert.equal(double.length, 6);

    // Every pair meets once at each ground.
    const asHome = new Map<string, number>();
    for (const round of double) {
      for (const { homeTeamId, awayTeamId } of round) {
        asHome.set(`${homeTeamId}>${awayTeamId}`, (asHome.get(`${homeTeamId}>${awayTeamId}`) ?? 0) + 1);
      }
    }
    for (const [fixture, count] of asHome) {
      assert.equal(count, 1, `${fixture} se juega mas de una vez`);
    }
    assert.equal(asHome.size, 12, 'deben ser 12 partidos con 4 equipos ida y vuelta');
  });
});
