'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { authApi } from './api';

interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
  aufaId?: string;
  ci?: string;
  playerId?: string;
}

export interface TenantMembership {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  tenants: TenantMembership[];
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [tenants, setTenants] = useState<TenantMembership[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    setTenants([]);
    localStorage.removeItem('aufa_token');
    localStorage.removeItem('aufa_refresh');
    localStorage.removeItem('aufa_tenant_id');
  }, []);

  useEffect(() => {
    const savedToken = localStorage.getItem('aufa_token');
    if (savedToken) {
      authApi.me(savedToken)
        .then((data) => {
          setUser({
            id: data.id,
            email: data.email,
            fullName: data.player?.fullName || data.email,
            role: data.role,
            playerId: data.playerId,
            aufaId: data.player?.aufaId,
            ci: data.player?.ci,
          });
          setToken(savedToken);
          const userTenants: TenantMembership[] = data.tenants || [];
          setTenants(userTenants);
          if (userTenants.length > 0 && !localStorage.getItem('aufa_tenant_id')) {
            localStorage.setItem('aufa_tenant_id', userTenants[0].tenantId);
          }
        })
        .catch(() => logout())
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [logout]);

  const login = async (identifier: string, password: string) => {
    const response = await authApi.login(identifier, password);
    setUser(response.user);
    setToken(response.accessToken);
    localStorage.setItem('aufa_token', response.accessToken);
    localStorage.setItem('aufa_refresh', response.refreshToken);

    // Fetch full user data including tenant memberships
    try {
      const meData = await authApi.me(response.accessToken);
      const userTenants: TenantMembership[] = meData.tenants || [];
      setTenants(userTenants);
      if (userTenants.length > 0) {
        localStorage.setItem('aufa_tenant_id', userTenants[0].tenantId);
      }
    } catch {
      // non-critical, tenant can be resolved later
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, tenants, isLoading, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
