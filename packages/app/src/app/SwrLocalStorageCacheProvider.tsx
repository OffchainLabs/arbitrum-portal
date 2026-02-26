'use client';

import { SWRConfig } from 'swr';

import { localStorageProvider } from '@/app-lib/swr/localStorageCache';

export function SwrLocalStorageCacheProvider({ children }: { children: React.ReactNode }) {
  return <SWRConfig value={{ provider: () => localStorageProvider() }}>{children}</SWRConfig>;
}
