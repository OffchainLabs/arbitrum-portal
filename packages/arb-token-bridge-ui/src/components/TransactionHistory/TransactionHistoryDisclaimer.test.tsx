import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { createBridgeTestWrapper } from '../../test-utils/bridge-test-wrapper';
import { CommonAddress } from '../../util/CommonAddressUtils';
import { defaultWalletContextValue } from '../../wallet/WalletContext';
import { TransactionHistoryDisclaimer } from './TransactionHistoryDisclaimer';

afterEach(cleanup);
describe.sequential('TransactionHistoryDisclaimer', () => {
  it.each([
    { accountType: 'externally-owned-account', balance: 0n, showLifi: false, showOft: false },
    { accountType: 'externally-owned-account', balance: 1n, showLifi: false, showOft: false },
    { accountType: 'smart-contract-wallet', balance: 0n, showLifi: true, showOft: false },
    { accountType: 'smart-contract-wallet', balance: 1n, showLifi: true, showOft: true },
  ])(
    'renders disclaimers for $accountType with USDT balance $balance',
    async ({ accountType, balance, showLifi, showOft }) => {
      const address = '0x1111111111111111111111111111111111111111';
      const { container } = render(<TransactionHistoryDisclaimer />, {
        wrapper: createBridgeTestWrapper({
          query: { sourceChain: 1, destinationChain: 42161 },
          wallets: {
            ...defaultWalletContextValue,
            evm: {
              ...defaultWalletContextValue.evm,
              isConnected: true,
              account: { ecosystem: 'evm', address, chainId: 1, status: 'connected' },
            },
          },
          cacheEntries: [[[address, 1, 'useAccountType'], accountType]],
          fetchBalance: async () => ({
            [CommonAddress.Ethereum.USDT]: balance,
            [CommonAddress.ArbitrumOne.USDT]: balance,
          }),
        }),
      });
      await waitFor(() => {
        expect(container.textContent?.includes('LiFi transactions')).toBe(showLifi);
        expect(container.textContent?.includes('LayerZero USDT')).toBe(showOft);
      });
    },
  );
});
