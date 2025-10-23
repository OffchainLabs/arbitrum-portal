'use client';

import '@rainbow-me/rainbowkit/styles.css';
import { AppProviders } from 'arb-token-bridge-ui/src/components/App/AppProviders';
import { PropsWithChildren } from 'react';

/**
 * Client-side wrapper for AppProviders (wallet connection, wagmi, rainbowkit)
 * This component must be a client component because AppProviders uses React hooks and context
 */
export function ProviderWrapper({ children }: PropsWithChildren) {
  return <AppProviders>{children}</AppProviders>;
}
