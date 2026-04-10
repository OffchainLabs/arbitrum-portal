'use client';

import type { PropsWithChildren } from 'react';

import { EvmWalletProvider } from './EvmWalletProvider';

export function WalletProvider({ children }: PropsWithChildren) {
  return <EvmWalletProvider>{children}</EvmWalletProvider>;
}
