import { GameType, TiebreakerCriteria, TournamentStatus } from './enums';

export interface LeagueRules {
  gameType: GameType;
  pointsForWin: number;
  pointsForDraw: number;
  pointsForLoss: number;
  fairPlayBonusPoints: number;
  tiebreakerOrder: TiebreakerCriteria[];
  maxSubstitutions: number | null; // null = unlimited
  playersPerTeam: number;
  minPlayersToStart: number;
}

export interface TournamentSummary {
  id: string;
  name: string;
  status: TournamentStatus;
  gameType: GameType;
  teamsCount: number;
  currentMatchday: number;
  startDate: string;
  endDate?: string;
}

export interface StandingsRow {
  position: number;
  teamId: string;
  teamName: string;
  teamLogoUrl?: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  fairPlayScore: number;
  form: ('W' | 'D' | 'L')[];
}

export interface VenueSlot {
  venueId: string;
  dayOfWeek: number; // 0=Sunday, 6=Saturday
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
}

export interface TeamRestriction {
  teamId: string;
  availableDays: number[];
  earliestTime?: string;
  latestTime?: string;
}
