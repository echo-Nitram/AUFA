import { UserRole } from './enums';

export interface AuthTokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  tenantId?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    role: UserRole;
    ci?: string;
  };
}

export interface RegisterPlayerRequest {
  ci: string;
  fullName: string;
  email: string;
  password: string;
  phone?: string;
  dateOfBirth: string;
}
