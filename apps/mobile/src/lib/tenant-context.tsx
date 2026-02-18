import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { tenantApi } from './api';
import { useAuth } from './auth-context';
import { storage } from './storage';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
}

interface TenantContextType {
  tenant: Tenant | null;
  tenantId: string | null;
  isLoading: boolean;
  setTenantId: (id: string) => void;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: ReactNode }) {
  const { tenants: authTenants, isLoading: authLoading } = useAuth();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [tenantId, setTenantIdState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load from storage on mount
  useEffect(() => {
    (async () => {
      const saved = await storage.getTenantId();
      if (saved) setTenantIdState(saved);
      setIsLoading(false);
    })();
  }, []);

  // Auto-detect from auth memberships
  useEffect(() => {
    if (!authLoading && !tenantId && authTenants.length > 0) {
      const first = authTenants[0].tenantId;
      setTenantIdState(first);
      storage.setTenantId(first);
    }
  }, [authTenants, authLoading, tenantId]);

  // Fetch tenant data when tenantId changes
  useEffect(() => {
    if (tenantId) {
      storage.setTenantId(tenantId);
      tenantApi.getCurrent(tenantId)
        .then((data) => setTenant({ id: data.id, name: data.name, slug: data.slug, plan: data.plan }))
        .catch(console.error);
    }
  }, [tenantId]);

  const setTenantId = (id: string) => {
    setTenantIdState(id);
    storage.setTenantId(id);
  };

  return (
    <TenantContext.Provider value={{ tenant, tenantId, isLoading, setTenantId }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) throw new Error('useTenant must be used within TenantProvider');
  return context;
}
