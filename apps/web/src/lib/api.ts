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
  createTournament: (tenantId: string, token: string, data: any) =>
    apiFetch('/api/league/tournaments', { tenantId, token, method: 'POST', body: JSON.stringify(data) }),
  getStandings: (tenantId: string, tournamentId: string) =>
    apiFetch(`/api/league/tournaments/${tournamentId}/standings`, { tenantId }),
  listTeams: (tenantId: string) => apiFetch('/api/league/teams', { tenantId }),
  getTeam: (tenantId: string, id: string) => apiFetch(`/api/league/teams/${id}`, { tenantId }),
  createTeam: (tenantId: string, token: string, data: any) =>
    apiFetch('/api/league/teams', { tenantId, token, method: 'POST', body: JSON.stringify(data) }),
  addPlayerToTeam: (tenantId: string, token: string, teamId: string, data: any) =>
    apiFetch(`/api/league/teams/${teamId}/players`, { tenantId, token, method: 'POST', body: JSON.stringify(data) }),
  registerTeamInTournament: (tenantId: string, token: string, tournamentId: string, teamId: string) =>
    apiFetch(`/api/league/tournaments/${tournamentId}/register/${teamId}`, { tenantId, token, method: 'POST' }),
};

// Match
export const matchApi = {
  listByTournament: (tenantId: string, tournamentId: string) =>
    apiFetch(`/api/matches/tournament/${tournamentId}`, { tenantId }),
  getMatch: (tenantId: string, id: string) => apiFetch(`/api/matches/${id}`, { tenantId }),
  getRosters: (tenantId: string, token: string, matchId: string) =>
    apiFetch(`/api/matches/${matchId}/rosters`, { tenantId, token }),
  enterMatchData: (tenantId: string, token: string, matchId: string, data: any) =>
    apiFetch(`/api/matches/${matchId}/data`, { tenantId, token, method: 'POST', body: JSON.stringify(data) }),
};

// Fixture
export const fixtureApi = {
  generate: (tenantId: string, token: string, tournamentId: string, data?: any) =>
    apiFetch(`/api/fixtures/generate/${tournamentId}`, { tenantId, token, method: 'POST', body: JSON.stringify(data || {}) }),
};

// AUFA ID
export const aufaIdApi = {
  lookup: (ci: string) => apiFetch(`/api/aufa-id/lookup/${ci}`),
  getPassport: (playerId: string) => apiFetch(`/api/aufa-id/passport/${playerId}`),
};

// Treasury
export const treasuryApi = {
  listOrders: (tenantId: string, token: string) => apiFetch('/api/treasury/orders', { tenantId, token }),
  getSummary: (tenantId: string, token: string) => apiFetch('/api/treasury/summary', { tenantId, token }),
  generateMatchdayOrders: (tenantId: string, token: string, data: any) =>
    apiFetch('/api/treasury/orders/generate-matchday', { tenantId, token, method: 'POST', body: JSON.stringify(data) }),
  processPayment: (tenantId: string, token: string, orderId: string) =>
    apiFetch(`/api/treasury/orders/${orderId}/pay`, { tenantId, token, method: 'POST', body: JSON.stringify({}) }),
};

// Tribunal
export const tribunalApi = {
  listSanctions: (tenantId: string, token: string, params?: string) =>
    apiFetch(`/api/tribunal/sanctions${params ? `?${params}` : ''}`, { tenantId, token }),
  getPending: (tenantId: string, token: string) => apiFetch('/api/tribunal/pending', { tenantId, token }),
  resolve: (tenantId: string, token: string, sanctionId: string, data: any) =>
    apiFetch(`/api/tribunal/sanctions/${sanctionId}/resolve`, { tenantId, token, method: 'POST', body: JSON.stringify(data) }),
};

// Stats
export const statsApi = {
  dashboard: (tenantId: string) => apiFetch(`/api/stats/dashboard`, { tenantId }),
  topScorers: (tenantId: string, tournamentId: string) => apiFetch(`/api/stats/scorers/${tournamentId}`, { tenantId }),
  cardsLeaders: (tenantId: string, tournamentId: string) => apiFetch(`/api/stats/cards/${tournamentId}`, { tenantId }),
  fairPlay: (tenantId: string, tournamentId: string) => apiFetch(`/api/stats/fairplay/${tournamentId}`, { tenantId }),
};
