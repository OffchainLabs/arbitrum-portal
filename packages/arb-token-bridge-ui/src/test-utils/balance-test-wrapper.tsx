import type { PropsWithChildren } from 'react';
import { SWRConfig } from 'swr';

import { WalletContext } from '../wallet/WalletContext';
import { BalanceProvider } from '../wallet/balance/BalanceContext';
import { createBalanceService } from '../wallet/balance/createBalanceService';
import type { BalanceClient, WalletContextValue } from '../wallet/types';

export function createBalanceTestWrapper(
  getWallets: () => WalletContextValue,
  fetchBalance: BalanceClient['fetchBalance'],
) {
  const cache = new Map();
  const service = createBalanceService(() => ({ fetchBalance }));
  return function Wrapper({ children }: PropsWithChildren) {
    return (
      <SWRConfig value={{ provider: () => cache, dedupingInterval: 0, shouldRetryOnError: false }}>
        <WalletContext.Provider value={getWallets()}>
          <BalanceProvider service={service}>{children}</BalanceProvider>
        </WalletContext.Provider>
      </SWRConfig>
    );
  };
}
