export interface StandingRow {
  teamId: string;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  fairPlaySum: number;
  fairPlayCount: number;
}

/** A played match, used to resolve head-to-head. */
export interface MatchResult {
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
}

export interface TiebreakerContext {
  matches: MatchResult[];
  pointsForWin: number;
  pointsForDraw: number;
  pointsForLoss: number;
}

export type TiebreakerCriteria = 'GOAL_DIFFERENCE' | 'GOALS_FOR' | 'HEAD_TO_HEAD' | 'FAIR_PLAY';

export function goalDifference(row: StandingRow): number {
  return row.goalsFor - row.goalsAgainst;
}

export function fairPlayScore(row: StandingRow): number {
  return row.fairPlayCount > 0 ? row.fairPlaySum / row.fairPlayCount : 0;
}

/**
 * Mini-table over only the matches played between the given teams.
 *
 * Head-to-head between three or more level teams is not a pairwise question:
 * A can beat B, B beat C and C beat A. The standard resolution is to score the
 * matches among them as their own little league, which is what this builds.
 */
function headToHeadTable(
  teamIds: string[],
  { matches, pointsForWin, pointsForDraw, pointsForLoss }: TiebreakerContext
): Map<string, { points: number; goalsFor: number; goalsAgainst: number }> {
  const inGroup = new Set(teamIds);
  const table = new Map(
    teamIds.map((id) => [id, { points: 0, goalsFor: 0, goalsAgainst: 0 }])
  );

  for (const match of matches) {
    if (!inGroup.has(match.homeTeamId) || !inGroup.has(match.awayTeamId)) continue;

    const home = table.get(match.homeTeamId)!;
    const away = table.get(match.awayTeamId)!;

    home.goalsFor += match.homeScore;
    home.goalsAgainst += match.awayScore;
    away.goalsFor += match.awayScore;
    away.goalsAgainst += match.homeScore;

    if (match.homeScore > match.awayScore) {
      home.points += pointsForWin;
      away.points += pointsForLoss;
    } else if (match.homeScore < match.awayScore) {
      away.points += pointsForWin;
      home.points += pointsForLoss;
    } else {
      home.points += pointsForDraw;
      away.points += pointsForDraw;
    }
  }

  return table;
}

/**
 * Ranks a set of level teams by one criterion.
 *
 * Returns a number per team, higher being better, or null when the criterion
 * cannot decide anything here — so the next criterion gets its turn instead of
 * the group being declared tied.
 */
function rankBy(
  criteria: string,
  group: StandingRow[],
  context?: TiebreakerContext
): Map<string, number[]> | null {
  switch (criteria as TiebreakerCriteria) {
    case 'GOAL_DIFFERENCE':
      return new Map(group.map((r) => [r.teamId, [goalDifference(r)]]));

    case 'GOALS_FOR':
      return new Map(group.map((r) => [r.teamId, [r.goalsFor]]));

    case 'FAIR_PLAY':
      return new Map(group.map((r) => [r.teamId, [fairPlayScore(r)]]));

    case 'HEAD_TO_HEAD': {
      if (!context) return null;
      const table = headToHeadTable(
        group.map((r) => r.teamId),
        context
      );
      // Inside the mini-table the order is points, then goal difference, then
      // goals scored — the same shape a full table uses.
      return new Map(
        group.map((r) => {
          const t = table.get(r.teamId)!;
          return [r.teamId, [t.points, t.goalsFor - t.goalsAgainst, t.goalsFor]];
        })
      );
    }

    default:
      return null;
  }
}

function compareKeys(a: number[], b: number[]): number {
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return b[i] - a[i];
  }
  return 0;
}

/**
 * Orders a set of teams that are level on points, applying the league's
 * criteria in the order the organizer configured them.
 */
function breakTie<T extends StandingRow>(
  group: T[],
  order: readonly string[],
  context?: TiebreakerContext
): T[] {
  if (group.length < 2) return group;

  const rankings = order
    .map((criteria) => rankBy(criteria, group, context))
    .filter((r): r is Map<string, number[]> => r !== null);

  return [...group].sort((a, b) => {
    for (const ranking of rankings) {
      const result = compareKeys(ranking.get(a.teamId)!, ranking.get(b.teamId)!);
      if (result !== 0) return result;
    }
    // Stable, deterministic last resort so the table does not reshuffle between
    // requests when two teams are equal on every configured criterion.
    return a.teamId.localeCompare(b.teamId);
  });
}

/**
 * Orders the table: points first, then the league's configured criteria.
 *
 * Pass `context` to make HEAD_TO_HEAD work; without it that criterion is
 * skipped and the ones after it still apply.
 */
export function applyTiebreakers<T extends StandingRow>(
  standings: T[],
  order: readonly string[],
  context?: TiebreakerContext
): T[] {
  const byPoints = [...standings].sort((a, b) => b.points - a.points);

  const result: T[] = [];
  let index = 0;

  while (index < byPoints.length) {
    let end = index + 1;
    while (end < byPoints.length && byPoints[end].points === byPoints[index].points) {
      end++;
    }

    result.push(...breakTie(byPoints.slice(index, end), order, context));
    index = end;
  }

  return result;
}
