import { Fragment, type PropsWithChildren } from 'react';
import { SWRConfig } from 'swr';

import { WalletContext } from '../wallet/WalletContext';
import { BalanceProvider } from '../wallet/balance/BalanceContext';
import { createBalanceService } from '../wallet/balance/createBalanceService';
import type { BalanceClient, WalletContextValue } from '../wallet/types';
import { createWalletTestWrapper } from './wallet-test-wrapper';

export function createBalanceTestWrapper(
  getWallets: () => WalletContextValue,
  fetchBalance: BalanceClient['fetchBalance'],
  query?: Record<string, string | number>,
) {
  const QueryWrapper = query ? createWalletTestWrapper({ query }) : Fragment;
  const cache = new Map();
  const service = createBalanceService(() => ({ fetchBalance }));
  return function Wrapper({ children }: PropsWithChildren) {
    return (
      <QueryWrapper>
        <SWRConfig
          value={{ provider: () => cache, dedupingInterval: 0, shouldRetryOnError: false }}
        >
          <WalletContext.Provider value={getWallets()}>
            <BalanceProvider service={service}>{children}</BalanceProvider>
          </WalletContext.Provider>
        </SWRConfig>
      </QueryWrapper>
    );
  };
}
