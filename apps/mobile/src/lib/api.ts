import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.apiUrl || 'http://192.168.1.100:3001';

/** Convert a relative upload path to a full URL */
export function assetUrl(path: string | null | undefined): string {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${API_URL}${path}`;
}

interface FetchOptions extends RequestInit {
  token?: string;
  tenantId?: string;
}

export async function apiFetch<T = any>(path: string, options: FetchOptions = {}): Promise<T> {
  const { token, tenantId, headers: customHeaders, ...rest } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((customHeaders as Record<string, string>) || {}),
  };

  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (tenantId) headers['X-Tenant-ID'] = tenantId;

  const response = await fetch(`${API_URL}${path}`, { ...rest, headers });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Error de red' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// Auth
export const authApi = {
  lookupCI: (ci: string) => apiFetch(`/api/auth/lookup/${ci}`),
  login: (identifier: string, password: string) =>
    apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ identifier, password }) }),
  register: (data: any) =>
    apiFetch('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  me: (token: string) => apiFetch('/api/auth/me', { token }),
};

// Tenant
export const tenantApi = {
  getCurrent: (tenantId: string) => apiFetch('/api/tenants/resolve/current', { tenantId }),
  getBySlug: (slug: string) => apiFetch(`/api/tenants/public/${slug}`),
  list: (token: string) => apiFetch('/api/tenants', { token }),
};

// League
export const leagueApi = {
  listTournaments: (tenantId: string) => apiFetch('/api/league/tournaments', { tenantId }),
  getTournament: (tenantId: string, id: string) => apiFetch(`/api/league/tournaments/${id}`, { tenantId }),
  getStandings: (tenantId: string, tournamentId: string) =>
    apiFetch(`/api/league/tournaments/${tournamentId}/standings`, { tenantId }),
  listTeams: (tenantId: string) => apiFetch('/api/league/teams', { tenantId }),
  getTeam: (tenantId: string, id: string) => apiFetch(`/api/league/teams/${id}`, { tenantId }),
  addPlayerToTeam: (tenantId: string, token: string, teamId: string, data: any) =>
    apiFetch(`/api/league/teams/${teamId}/players`, { tenantId, token, method: 'POST', body: JSON.stringify(data) }),
};

// Match
export const matchApi = {
  listByTournament: (tenantId: string, tournamentId: string) =>
    apiFetch(`/api/matches/tournament/${tournamentId}`, { tenantId }),
  getMatch: (tenantId: string, id: string) => apiFetch(`/api/matches/${id}`, { tenantId }),
  getStats: (tenantId: string, matchId: string) => apiFetch(`/api/matches/${matchId}/stats`, { tenantId }),
};

// AUFA ID
export const aufaIdApi = {
  lookup: (ci: string) => apiFetch(`/api/aufa-id/lookup/${ci}`),
  getPassport: (playerId: string) => apiFetch(`/api/aufa-id/passport/${playerId}`),
};

// Stats
export const statsApi = {
  dashboard: (tenantId: string) => apiFetch('/api/stats/dashboard', { tenantId }),
  topScorers: (tenantId: string, tournamentId: string) => apiFetch(`/api/stats/scorers/${tournamentId}`, { tenantId }),
  fairPlay: (tenantId: string, tournamentId: string) => apiFetch(`/api/stats/fairplay/${tournamentId}`, { tenantId }),
};

// Tribunal
export const tribunalApi = {
  listSanctions: (tenantId: string, token: string, params?: string) =>
    apiFetch(`/api/tribunal/sanctions${params ? `?${params}` : ''}`, { tenantId, token }),
  checkEligibility: (tenantId: string, playerId: string) =>
    apiFetch(`/api/tribunal/eligibility/${playerId}`, { tenantId }),
};

// Referee
export const refereeApi = {
  listAvailable: (dayOfWeek?: number) =>
    apiFetch(`/api/referees/available${dayOfWeek !== undefined ? `?dayOfWeek=${dayOfWeek}` : ''}`),
  getProfile: (id: string) => apiFetch(`/api/referees/${id}`),
};
