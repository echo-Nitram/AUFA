export enum GameType {
  F5 = 'F5',
  F7 = 'F7',
  F11 = 'F11',
}

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  LEAGUE_ADMIN = 'LEAGUE_ADMIN',
  LEAGUE_OPERATOR = 'LEAGUE_OPERATOR',
  REFEREE = 'REFEREE',
  CAPTAIN = 'CAPTAIN',
  PLAYER = 'PLAYER',
}

export enum SubscriptionPlan {
  BARRIO = 'BARRIO',
  LIGA_PRO = 'LIGA_PRO',
  ENTERPRISE = 'ENTERPRISE',
}

export enum MatchStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  SUSPENDED = 'SUSPENDED',
  DEFAULT_HOME = 'DEFAULT_HOME',
  DEFAULT_AWAY = 'DEFAULT_AWAY',
}

export enum CardType {
  YELLOW = 'YELLOW',
  RED = 'RED',
}

export enum SanctionStatus {
  AUTO_APPLIED = 'AUTO_APPLIED',
  PENDING_TRIBUNAL = 'PENDING_TRIBUNAL',
  RESOLVED = 'RESOLVED',
}

export enum SanctionSeverity {
  LIGHT = 'LIGHT',
  GRAVE = 'GRAVE',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  DEFAULTED = 'DEFAULTED',
}

export enum IdentityValidationStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum TournamentStatus {
  DRAFT = 'DRAFT',
  REGISTRATION = 'REGISTRATION',
  IN_PROGRESS = 'IN_PROGRESS',
  FINISHED = 'FINISHED',
  CANCELLED = 'CANCELLED',
}

export enum TiebreakerCriteria {
  GOAL_DIFFERENCE = 'GOAL_DIFFERENCE',
  GOALS_FOR = 'GOALS_FOR',
  HEAD_TO_HEAD = 'HEAD_TO_HEAD',
  FAIR_PLAY = 'FAIR_PLAY',
}
