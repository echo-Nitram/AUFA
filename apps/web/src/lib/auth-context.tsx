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

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('aufa_token');
    localStorage.removeItem('aufa_refresh');
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
          });
          setToken(savedToken);
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
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
