'use client';

import { createContext, useContext, ReactNode } from 'react';

interface PublicLeague {
  id: string;
  name: string;
  slug: string;
}

const PublicLeagueContext = createContext<PublicLeague | null>(null);

export function PublicLeagueProvider({ league, children }: { league: PublicLeague; children: ReactNode }) {
  return (
    <PublicLeagueContext.Provider value={league}>
      {children}
    </PublicLeagueContext.Provider>
  );
}

export function usePublicLeague() {
  const ctx = useContext(PublicLeagueContext);
  if (!ctx) throw new Error('usePublicLeague must be used within PublicLeagueProvider');
  return ctx;
}
