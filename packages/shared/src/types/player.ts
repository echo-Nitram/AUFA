import { IdentityValidationStatus } from './enums';

export interface PlayerProfile {
  id: string;
  aufaId: string;
  ci: string;
  fullName: string;
  email: string;
  phone?: string;
  dateOfBirth: string;
  photoUrl?: string;
  ciPhotoFrontUrl?: string;
  ciPhotoBackUrl?: string;
  selfieUrl?: string;
  identityStatus: IdentityValidationStatus;
  medicalClearance?: MedicalClearance;
  stats: PlayerCareerStats;
}

export interface MedicalClearance {
  id: string;
  documentUrl: string;
  expiresAt: string;
  isValid: boolean;
  uploadedAt: string;
}

export interface PlayerCareerStats {
  totalMatches: number;
  totalGoals: number;
  totalAssists: number;
  totalYellowCards: number;
  totalRedCards: number;
  leagues: PlayerLeagueStats[];
}

export interface PlayerLeagueStats {
  leagueId: string;
  leagueName: string;
  matches: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  championships: number;
}

export interface FairPlayScore {
  teamId: string;
  leagueId: string;
  averageScore: number;
  totalRatings: number;
}
