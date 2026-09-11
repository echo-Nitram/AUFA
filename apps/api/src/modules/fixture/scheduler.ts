import { Pairing } from './round-robin';

export interface VenueSlot {
  venueId: string;
  dayOfWeek: number; // 0 = Sunday
  startTime: string; // "HH:mm"
}

export interface TeamRestriction {
  teamId: string;
  /** Days the team can play. Undefined means any day. */
  availableDays?: number[];
  /** Earliest kick-off the team accepts, "HH:mm". */
  earliestTime?: string;
  /** Latest kick-off the team accepts, "HH:mm". */
  latestTime?: string;
}

export interface ScheduledMatch extends Pairing {
  matchday: number;
  venueId: string;
  scheduledAt: Date;
}

export interface UnscheduledMatch extends Pairing {
  matchday: number;
  reason: string;
}

export interface ScheduleResult {
  scheduled: ScheduledMatch[];
  unscheduled: UnscheduledMatch[];
}

export interface ScheduleOptions {
  pairings: Pairing[][];
  slots: VenueSlot[];
  startDate: Date;
  restrictions?: TeamRestriction[];
  /** Days of the week each matchday may spread over. */
  matchdayWindowDays?: number;
}

const MINUTES_IN_DAY = 24 * 60;

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m || 0);
}

/** Midnight of the given date, so day arithmetic is not shifted by the start time. */
function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function at(date: Date, time: string): Date {
  const d = new Date(date);
  const [h, m] = time.split(':').map(Number);
  d.setHours(h, m || 0, 0, 0);
  return d;
}

function allows(restriction: TeamRestriction | undefined, day: number, minutes: number): boolean {
  if (!restriction) return true;
  if (restriction.availableDays && !restriction.availableDays.includes(day)) return false;
  if (restriction.earliestTime && minutes < toMinutes(restriction.earliestTime)) return false;
  if (restriction.latestTime && minutes > toMinutes(restriction.latestTime)) return false;
  return true;
}

/**
 * Places each pairing on a free venue slot.
 *
 * A match is only placed where the ground is free, neither side is already
 * playing at that moment, and both sides' restrictions allow the day and time.
 * When no slot in the matchday's window satisfies all of that, the match is
 * returned under `unscheduled` with the reason — the organizer needs to know a
 * date is missing rather than receive a fixture that is quietly incomplete.
 */
export function scheduleMatches({
  pairings,
  slots,
  startDate,
  restrictions = [],
  matchdayWindowDays = 7,
}: ScheduleOptions): ScheduleResult {
  const scheduled: ScheduledMatch[] = [];
  const unscheduled: UnscheduledMatch[] = [];

  if (slots.length === 0) {
    for (const [index, round] of pairings.entries()) {
      for (const pair of round) {
        unscheduled.push({ ...pair, matchday: index + 1, reason: 'No hay canchas con horarios cargados' });
      }
    }
    return { scheduled, unscheduled };
  }

  const restrictionByTeam = new Map(restrictions.map((r) => [r.teamId, r]));

  // "venueId@timestamp" and "teamId@timestamp" of everything already placed.
  const takenVenue = new Set<string>();
  const takenTeam = new Set<string>();

  const base = startOfDay(startDate);

  for (const [index, round] of pairings.entries()) {
    const matchday = index + 1;
    const windowStart = addDays(base, index * matchdayWindowDays);

    for (const pair of round) {
      const homeRestriction = restrictionByTeam.get(pair.homeTeamId);
      const awayRestriction = restrictionByTeam.get(pair.awayTeamId);

      let placed = false;
      let sawCandidate = false;

      // Walk the window day by day, trying every slot that falls on that day.
      for (let offset = 0; offset < matchdayWindowDays && !placed; offset++) {
        const day = addDays(windowStart, offset);
        const dayOfWeek = day.getDay();

        const daySlots = slots
          .filter((s) => s.dayOfWeek === dayOfWeek)
          .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));

        for (const slot of daySlots) {
          const minutes = toMinutes(slot.startTime);
          if (minutes >= MINUTES_IN_DAY) continue;

          if (!allows(homeRestriction, dayOfWeek, minutes)) continue;
          if (!allows(awayRestriction, dayOfWeek, minutes)) continue;

          sawCandidate = true;

          const when = at(day, slot.startTime);
          const stamp = when.getTime();

          if (takenVenue.has(`${slot.venueId}@${stamp}`)) continue;
          if (takenTeam.has(`${pair.homeTeamId}@${stamp}`)) continue;
          if (takenTeam.has(`${pair.awayTeamId}@${stamp}`)) continue;

          takenVenue.add(`${slot.venueId}@${stamp}`);
          takenTeam.add(`${pair.homeTeamId}@${stamp}`);
          takenTeam.add(`${pair.awayTeamId}@${stamp}`);

          scheduled.push({ ...pair, matchday, venueId: slot.venueId, scheduledAt: when });
          placed = true;
          break;
        }
      }

      if (!placed) {
        unscheduled.push({
          ...pair,
          matchday,
          reason: sawCandidate
            ? 'Todos los horarios compatibles ya estaban ocupados en esa fecha'
            : 'Ningun horario de cancha cumple las restricciones de ambos equipos',
        });
      }
    }
  }

  return { scheduled, unscheduled };
}
