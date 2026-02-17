'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { tenantApi } from './api';

interface TenantBranding {
  logoUrl?: string;
  bannerUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
  subdomain: string;
  plan: string;
  branding: TenantBranding;
}

interface TenantContextType {
  tenant: Tenant | null;
  tenantId: string | null;
  isLoading: boolean;
  setTenantId: (id: string) => void;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Try to detect tenant from subdomain
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const subdomain = hostname.split('.')[0];

      // Check localStorage for saved tenant
      const savedTenantId = localStorage.getItem('aufa_tenant_id');
      if (savedTenantId) {
        setTenantId(savedTenantId);
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (tenantId) {
      localStorage.setItem('aufa_tenant_id', tenantId);
      tenantApi.getCurrent(tenantId)
        .then((data) => {
          const t: Tenant = {
            id: data.id,
            name: data.name,
            slug: data.slug,
            subdomain: data.subdomain,
            plan: data.plan,
            branding: {
              logoUrl: data.logoUrl,
              bannerUrl: data.bannerUrl,
              primaryColor: data.primaryColor,
              secondaryColor: data.secondaryColor,
              accentColor: data.accentColor,
              backgroundColor: data.backgroundColor,
              textColor: data.textColor,
            },
          };
          setTenant(t);
          applyBranding(t.branding);
        })
        .catch(console.error);
    }
  }, [tenantId]);

  return (
    <TenantContext.Provider value={{ tenant, tenantId, isLoading, setTenantId }}>
      {children}
    </TenantContext.Provider>
  );
}

function applyBranding(branding: TenantBranding) {
  const root = document.documentElement;
  root.style.setProperty('--color-primary', branding.primaryColor);
  root.style.setProperty('--color-secondary', branding.secondaryColor);
  root.style.setProperty('--color-accent', branding.accentColor);
  root.style.setProperty('--color-background', branding.backgroundColor);
  root.style.setProperty('--color-text', branding.textColor);
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) throw new Error('useTenant must be used within TenantProvider');
  return context;
}
