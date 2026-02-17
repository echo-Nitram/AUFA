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

// Raw fetch for file uploads (no JSON content-type)
async function apiUpload<T = any>(path: string, formData: FormData, token: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData,
  });

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
  requestPasswordReset: (email: string) =>
    apiFetch('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (token: string, password: string) =>
    apiFetch('/api/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) }),
};

// Tenant
export const tenantApi = {
  getCurrent: (tenantId: string) => apiFetch('/api/tenants/resolve/current', { tenantId }),
  getBySlug: (slug: string) => apiFetch(`/api/tenants/public/${slug}`),
  list: (token: string) => apiFetch('/api/tenants', { token }),
  createSelfService: (data: any) =>
    apiFetch('/api/tenants/create', { method: 'POST', body: JSON.stringify(data) }),
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
  listVenues: (tenantId: string) => apiFetch('/api/league/venues', { tenantId }),
  createVenue: (tenantId: string, token: string, data: any) =>
    apiFetch('/api/league/venues', { tenantId, token, method: 'POST', body: JSON.stringify(data) }),
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

// Admin (tenant management)
export const adminApi = {
  getSettings: (tenantId: string, token: string) =>
    apiFetch('/api/tenants/admin/settings', { tenantId, token }),
  updateSettings: (tenantId: string, token: string, data: any) =>
    apiFetch('/api/tenants/admin/settings', { tenantId, token, method: 'PUT', body: JSON.stringify(data) }),
  listMembers: (tenantId: string, token: string) =>
    apiFetch('/api/tenants/admin/members', { tenantId, token }),
  addMember: (tenantId: string, token: string, data: any) =>
    apiFetch('/api/tenants/admin/members', { tenantId, token, method: 'POST', body: JSON.stringify(data) }),
  updateMemberRole: (tenantId: string, token: string, memberId: string, role: string) =>
    apiFetch(`/api/tenants/admin/members/${memberId}`, { tenantId, token, method: 'PUT', body: JSON.stringify({ role }) }),
  removeMember: (tenantId: string, token: string, memberId: string) =>
    apiFetch(`/api/tenants/admin/members/${memberId}`, { tenantId, token, method: 'DELETE' }),
};

// Referees
export const refereeApi = {
  listAvailable: (dayOfWeek?: number) =>
    apiFetch(`/api/referees/available${dayOfWeek !== undefined ? `?dayOfWeek=${dayOfWeek}` : ''}`),
  getProfile: (id: string) => apiFetch(`/api/referees/${id}`),
  hire: (tenantId: string, token: string, refereeId: string, matchIds: string[]) =>
    apiFetch('/api/referees/hire', { tenantId, token, method: 'POST', body: JSON.stringify({ refereeId, matchIds }) }),
  listMatchesByTournament: (tenantId: string, tournamentId: string) =>
    apiFetch(`/api/matches/tournament/${tournamentId}`, { tenantId }),
};

// Stats
export const statsApi = {
  dashboard: (tenantId: string) => apiFetch(`/api/stats/dashboard`, { tenantId }),
  topScorers: (tenantId: string, tournamentId: string) => apiFetch(`/api/stats/scorers/${tournamentId}`, { tenantId }),
  cardsLeaders: (tenantId: string, tournamentId: string) => apiFetch(`/api/stats/cards/${tournamentId}`, { tenantId }),
  fairPlay: (tenantId: string, tournamentId: string) => apiFetch(`/api/stats/fairplay/${tournamentId}`, { tenantId }),
};

// Uploads
export const uploadApi = {
  uploadFile: (token: string, file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return apiUpload('/api/upload/file', fd, token);
  },
  uploadIdentity: (token: string, ciFront: File, ciBack: File, selfie: File) => {
    const fd = new FormData();
    fd.append('ciFront', ciFront);
    fd.append('ciBack', ciBack);
    fd.append('selfie', selfie);
    return apiUpload('/api/upload/identity', fd, token);
  },
  uploadMedical: (token: string, document: File, issuedAt: string, expiresAt: string) => {
    const fd = new FormData();
    fd.append('document', document);
    fd.append('issuedAt', issuedAt);
    fd.append('expiresAt', expiresAt);
    return apiUpload('/api/upload/medical', fd, token);
  },
  uploadLogo: (token: string, logo: File) => {
    const fd = new FormData();
    fd.append('logo', logo);
    return apiUpload('/api/upload/logo', fd, token);
  },
};
