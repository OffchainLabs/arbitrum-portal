'use client';

import React, { Suspense, lazy } from 'react';
import type { PropsWithChildren } from 'react';

import { isSolanaEnabled } from '../../util/featureFlag';
import { EvmBalanceProvider } from './EvmBalanceProvider';
import { EvmSignerProvider } from './EvmSignerProvider';
import { EvmWalletProvider } from './EvmWalletProvider';
import {
  SolanaBalanceContext,
  SolanaBalanceProvider,
  defaultSolanaBalanceContextValue,
} from './SolanaBalanceProvider';
import {
  SolanaSignerContext,
  SolanaSignerProvider,
  defaultSolanaSignerContextValue,
} from './SolanaSignerProvider';
import { SolanaWalletContext, defaultSolanaWalletContextValue } from './SolanaWalletProvider';

const LazySolanaWalletProvider = lazy(() =>
  import('./SolanaWalletProvider').then((module) => ({
    default: module.SolanaWalletProvider,
  })),
);

function SolanaFallbackProvider({ children }: PropsWithChildren) {
  return (
    <SolanaWalletContext.Provider value={defaultSolanaWalletContextValue}>
      <SolanaSignerContext.Provider value={defaultSolanaSignerContextValue}>
        <SolanaBalanceContext.Provider value={defaultSolanaBalanceContextValue}>
          {children}
        </SolanaBalanceContext.Provider>
      </SolanaSignerContext.Provider>
    </SolanaWalletContext.Provider>
  );
}

export function WalletProvider({ children }: PropsWithChildren) {
  if (!isSolanaEnabled()) {
    return (
      <EvmWalletProvider>
        <EvmSignerProvider>
          <EvmBalanceProvider>{children}</EvmBalanceProvider>
        </EvmSignerProvider>
      </EvmWalletProvider>
    );
  }

  return (
    <EvmWalletProvider>
      <EvmSignerProvider>
        <EvmBalanceProvider>
          <Suspense fallback={<SolanaFallbackProvider>{children}</SolanaFallbackProvider>}>
            <LazySolanaWalletProvider>
              <SolanaSignerProvider>
                <SolanaBalanceProvider>{children}</SolanaBalanceProvider>
              </SolanaSignerProvider>
            </LazySolanaWalletProvider>
          </Suspense>
        </EvmBalanceProvider>
      </EvmSignerProvider>
    </EvmWalletProvider>
  );
}
