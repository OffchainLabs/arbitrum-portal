'use client';

import { type PropsWithChildren, createContext, useContext } from 'react';

import type { BalanceService } from './createBalanceService';

const BalanceContext = createContext<BalanceService | undefined>(undefined);

export function BalanceProvider({
  children,
  service,
}: PropsWithChildren<{ service: BalanceService }>) {
  return <BalanceContext.Provider value={service}>{children}</BalanceContext.Provider>;
}

export function useBalanceService(): BalanceService {
  const service = useContext(BalanceContext);

  if (!service) {
    throw new Error('useBalanceService must be used within BalanceProvider.');
  }

  return service;
}
