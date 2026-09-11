export interface Pairing {
  homeTeamId: string;
  awayTeamId: string;
}

/** Marks the resting team when the count is odd. */
const BYE = '__BYE__';

/**
 * Round-robin pairings by the circle method: one team stays fixed while the
 * rest rotate, which pairs every team exactly once per round and every pair
 * exactly once across the tournament.
 *
 * Returns rounds of unordered pairs; deciding who plays at home is
 * assignHomeAway's job.
 */
export function generateRounds(teamIds: string[]): [string, string][][] {
  const teams = [...teamIds];
  if (teams.length < 2) return [];
  if (teams.length % 2 !== 0) teams.push(BYE);

  const n = teams.length;
  const rounds: [string, string][][] = [];

  for (let round = 0; round < n - 1; round++) {
    const pairs: [string, string][] = [];

    for (let i = 0; i < n / 2; i++) {
      const a = teams[i];
      const b = teams[n - 1 - i];
      if (a !== BYE && b !== BYE) {
        pairs.push([a, b]);
      }
    }

    rounds.push(pairs);

    // Rotate everything except the first position.
    teams.splice(1, 0, teams.pop()!);
  }

  return rounds;
}

/**
 * Orients each pair into home and away, giving the slot to whichever team has
 * been home least so far. Alternating by round on its own leaves the fixed team
 * of the circle method always at home.
 */
export function assignHomeAway(rounds: [string, string][][]): Pairing[][] {
  const homeCount = new Map<string, number>();
  const bump = (id: string) => homeCount.set(id, (homeCount.get(id) ?? 0) + 1);
  const count = (id: string) => homeCount.get(id) ?? 0;

  return rounds.map((pairs) =>
    pairs.map(([a, b]) => {
      const [homeTeamId, awayTeamId] = count(a) <= count(b) ? [a, b] : [b, a];
      bump(homeTeamId);
      return { homeTeamId, awayTeamId };
    })
  );
}

/**
 * Mirrors a single round-robin into a second leg with the venues swapped, so
 * every pair meets once at each ground.
 */
export function addSecondLeg(firstLeg: Pairing[][]): Pairing[][] {
  const secondLeg = firstLeg.map((round) =>
    round.map(({ homeTeamId, awayTeamId }) => ({
      homeTeamId: awayTeamId,
      awayTeamId: homeTeamId,
    }))
  );
  return [...firstLeg, ...secondLeg];
}

/**
 * Full pairing schedule for a tournament.
 */
export function buildPairings(teamIds: string[], doubleRound: boolean): Pairing[][] {
  const oriented = assignHomeAway(generateRounds(teamIds));
  return doubleRound ? addSecondLeg(oriented) : oriented;
}
