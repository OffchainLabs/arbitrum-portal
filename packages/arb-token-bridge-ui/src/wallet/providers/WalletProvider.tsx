'use client';

import React, { Suspense, lazy } from 'react';
import type { PropsWithChildren } from 'react';

import { isSolanaEnabled } from '../../util/featureFlag';
import {
  SolanaWalletContext,
  defaultSolanaWalletContextValue,
} from '../contexts/SolanaWalletContext';
import { EvmWalletProvider } from './EvmWalletProvider';

const LazySolanaWalletProvider = lazy(() =>
  import('./SolanaWalletProvider').then((module) => ({
    default: module.SolanaWalletProvider,
  })),
);

function SolanaFallbackProvider({ children }: PropsWithChildren) {
  return (
    <SolanaWalletContext.Provider value={defaultSolanaWalletContextValue}>
      {children}
    </SolanaWalletContext.Provider>
  );
}

export function WalletProvider({ children }: PropsWithChildren) {
  if (!isSolanaEnabled()) {
    return <EvmWalletProvider>{children}</EvmWalletProvider>;
  }

  return (
    <EvmWalletProvider>
      <Suspense fallback={<SolanaFallbackProvider>{children}</SolanaFallbackProvider>}>
        <LazySolanaWalletProvider>{children}</LazySolanaWalletProvider>
      </Suspense>
    </EvmWalletProvider>
  );
}
