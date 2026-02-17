import { MatchStatus, CardType } from './enums';

export interface MatchDetail {
  id: string;
  tournamentId: string;
  matchday: number;
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
  venueId?: string;
  venueName?: string;
  scheduledAt: string;
  status: MatchStatus;
  refereeId?: string;
  homeScore?: number;
  awayScore?: number;
  fairPlayScoreHome?: number;
  fairPlayScoreAway?: number;
  events: MatchEvent[];
}

export interface MatchEvent {
  id: string;
  matchId: string;
  type: 'GOAL' | 'YELLOW_CARD' | 'RED_CARD' | 'SUBSTITUTION';
  playerId: string;
  playerName: string;
  teamId: string;
  minute: number;
  detail?: string; // e.g., assist player for goals, reason for cards
}

export interface MatchDataEntry {
  homeScore: number;
  awayScore: number;
  homeFairPlay: number;
  awayFairPlay: number;
  homeLineup: string[];
  awayLineup: string[];
  goals: GoalEntry[];
  cards: CardEntry[];
  substitutions: SubstitutionEntry[];
  incidents?: string;
}

export interface GoalEntry {
  playerId: string;
  teamId: string;
  minute: number;
  assistPlayerId?: string;
}

export interface CardEntry {
  playerId: string;
  teamId: string;
  minute: number;
  type: CardType;
  reason?: string;
}

export interface SubstitutionEntry {
  playerOutId: string;
  playerInId: string;
  teamId: string;
  minute: number;
}
