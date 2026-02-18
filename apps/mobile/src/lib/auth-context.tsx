import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { authApi } from './api';
import { storage } from './storage';

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

  const logout = useCallback(async () => {
    setUser(null);
    setToken(null);
    setTenants([]);
    await storage.clearAll();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const savedToken = await storage.getToken();
        if (savedToken) {
          const data = await authApi.me(savedToken);
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
          if (userTenants.length > 0) {
            const existingTenantId = await storage.getTenantId();
            if (!existingTenantId) {
              await storage.setTenantId(userTenants[0].tenantId);
            }
          }
        }
      } catch {
        await logout();
      } finally {
        setIsLoading(false);
      }
    })();
  }, [logout]);

  const login = async (identifier: string, password: string) => {
    const response = await authApi.login(identifier, password);
    setUser(response.user);
    setToken(response.accessToken);
    await storage.setToken(response.accessToken);
    await storage.setRefresh(response.refreshToken);

    try {
      const meData = await authApi.me(response.accessToken);
      const userTenants: TenantMembership[] = meData.tenants || [];
      setTenants(userTenants);
      if (userTenants.length > 0) {
        await storage.setTenantId(userTenants[0].tenantId);
      }
    } catch {
      // non-critical
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
