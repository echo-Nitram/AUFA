import { SubscriptionPlan } from './enums';

export interface TenantConfig {
  id: string;
  name: string;
  slug: string;
  subdomain: string;
  customDomain?: string;
  plan: SubscriptionPlan;
  branding: TenantBranding;
  isActive: boolean;
}

export interface TenantBranding {
  logoUrl?: string;
  bannerUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
}

export interface CreateTenantRequest {
  name: string;
  slug: string;
  plan: SubscriptionPlan;
  adminEmail: string;
  adminFullName: string;
  adminPassword: string;
  branding?: Partial<TenantBranding>;
}
