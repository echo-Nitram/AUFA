const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (tenantId) {
    headers['X-Tenant-ID'] = tenantId;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Error de red' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  register: (data: any) =>
    apiFetch('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }),

  me: (token: string) =>
    apiFetch('/api/auth/me', { token }),

  refresh: (refreshToken: string) =>
    apiFetch('/api/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken }) }),
};

// Tenant API
export const tenantApi = {
  getCurrent: (tenantId: string) =>
    apiFetch('/api/tenants/resolve/current', { tenantId }),

  list: (token: string) =>
    apiFetch('/api/tenants', { token }),

  create: (token: string, data: any) =>
    apiFetch('/api/tenants', { token, method: 'POST', body: JSON.stringify(data) }),
};

// League API (tenant-scoped)
export const leagueApi = {
  listTournaments: (tenantId: string) =>
    apiFetch('/api/league/tournaments', { tenantId }),

  getTournament: (tenantId: string, id: string) =>
    apiFetch(`/api/league/tournaments/${id}`, { tenantId }),

  getStandings: (tenantId: string, tournamentId: string) =>
    apiFetch(`/api/league/tournaments/${tournamentId}/standings`, { tenantId }),

  listTeams: (tenantId: string) =>
    apiFetch('/api/league/teams', { tenantId }),

  getTeam: (tenantId: string, id: string) =>
    apiFetch(`/api/league/teams/${id}`, { tenantId }),
};

// Match API
export const matchApi = {
  listByTournament: (tenantId: string, tournamentId: string, matchday?: number) =>
    apiFetch(`/api/matches/tournament/${tournamentId}${matchday ? `?matchday=${matchday}` : ''}`, { tenantId }),

  getMatch: (tenantId: string, id: string) =>
    apiFetch(`/api/matches/${id}`, { tenantId }),
};

// AUFA ID API
export const aufaIdApi = {
  lookup: (ci: string) =>
    apiFetch(`/api/aufa-id/lookup/${ci}`),

  getPassport: (playerId: string) =>
    apiFetch(`/api/aufa-id/passport/${playerId}`),
};
