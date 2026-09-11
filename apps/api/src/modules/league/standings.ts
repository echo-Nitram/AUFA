export interface StandingRow {
  teamId: string;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  fairPlaySum: number;
  fairPlayCount: number;
}

export type TiebreakerCriteria = 'GOAL_DIFFERENCE' | 'GOALS_FOR' | 'HEAD_TO_HEAD' | 'FAIR_PLAY';

export function goalDifference(row: StandingRow): number {
  return row.goalsFor - row.goalsAgainst;
}

export function fairPlayScore(row: StandingRow): number {
  return row.fairPlayCount > 0 ? row.fairPlaySum / row.fairPlayCount : 0;
}

/**
 * Orders the table: points first, then the league's configured criteria in the
 * order the organizer set them.
 *
 * HEAD_TO_HEAD is accepted but has no effect here, because deciding it needs the
 * results of the matches between the tied teams, which this table does not
 * carry. It is skipped rather than treated as a tie so the criteria after it
 * still apply.
 */
export function applyTiebreakers<T extends StandingRow>(
  standings: T[],
  order: readonly string[]
): T[] {
  return [...standings].sort((a, b) => {
    if (a.points !== b.points) return b.points - a.points;

    for (const criteria of order) {
      switch (criteria as TiebreakerCriteria) {
        case 'GOAL_DIFFERENCE': {
          const diff = goalDifference(b) - goalDifference(a);
          if (diff !== 0) return diff;
          break;
        }
        case 'GOALS_FOR': {
          if (a.goalsFor !== b.goalsFor) return b.goalsFor - a.goalsFor;
          break;
        }
        case 'FAIR_PLAY': {
          const diff = fairPlayScore(b) - fairPlayScore(a);
          if (diff !== 0) return diff;
          break;
        }
        case 'HEAD_TO_HEAD':
          break;
      }
    }

    // Stable, deterministic last resort so the table does not reshuffle between
    // requests when two teams are equal on every configured criterion.
    return a.teamId.localeCompare(b.teamId);
  });
}
