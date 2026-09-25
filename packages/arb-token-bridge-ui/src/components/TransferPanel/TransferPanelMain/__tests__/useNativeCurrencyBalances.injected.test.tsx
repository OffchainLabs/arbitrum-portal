import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ChainId } from '../../../../types/ChainId';
import { getWagmiChain } from '../../../../util/wagmi/getWagmiChain';
import { WalletContext, defaultWalletContextValue } from '../../../../wallet/WalletContext';
import { BalanceProvider } from '../../../../wallet/balance/BalanceContext';
import { createBalanceService } from '../../../../wallet/balance/createBalanceService';
import type { FetchBalanceInput, WalletContextValue } from '../../../../wallet/types';
import { useNativeCurrencyBalances } from '../useNativeCurrencyBalances';

const recipient = '0x3333333333333333333333333333333333333333';
const payer = '0x2222222222222222222222222222222222222222';
const source = 'So11111111111111111111111111111111111111112';
vi.mock('../../../../hooks/useNetworks', () => ({
  useNetworks: () => [
    {
      sourceChain: getWagmiChain(ChainId.Solana),
      destinationChain: getWagmiChain(ChainId.ArbitrumOne),
    },
    vi.fn(),
  ],
}));
vi.mock('../../../../hooks/useArbQueryParams', () => ({
  useArbQueryParams: () => [{ destinationAddress: recipient }, vi.fn()],
}));
vi.mock('../../../../services/nativeCurrency', () => ({
  fetchNativeCurrency: async () => ({
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
    isCustom: false,
  }),
}));
vi.mock('../../../../token-bridge-sdk/utils', () => ({
  getProviderForChainId: () => {
    throw new Error('A shared balance consumer requested an EVM provider');
  },
}));
function Balances() {
  const balances = useNativeCurrencyBalances();
  return (
    <output>
      {Object.values(balances)
        .map((value) => value?.toString() ?? 'disconnected')
        .join('/')}
    </output>
  );
}
describe.sequential('injected native balances', () => {
  afterEach(cleanup);
  it('renders independent wallet, recipient and gas balances without a wallet SDK provider', async () => {
    const fetchBalance = vi.fn(
      async ({ chainId, walletAddress, tokenAddresses }: FetchBalanceInput) =>
        Object.fromEntries(
          tokenAddresses.map((token) => [
            token,
            chainId === ChainId.Solana
              ? 12345678901234567890n
              : walletAddress === recipient
                ? 900n
                : 100n,
          ]),
        ),
    );
    const service = createBalanceService(() => ({ fetchBalance }));
    const wallets: WalletContextValue = {
      ...defaultWalletContextValue,
      solana: {
        ...defaultWalletContextValue.solana,
        isConnected: true,
        account: {
          ecosystem: 'solana',
          status: 'connected',
          address: source,
          chainId: ChainId.Solana,
        },
      },
      evm: {
        ...defaultWalletContextValue.evm,
        isConnected: true,
        account: {
          ecosystem: 'evm',
          status: 'connected',
          address: payer,
          chainId: ChainId.ArbitrumOne,
        },
      },
    };
    const cache = new Map();
    const ui = (value: WalletContextValue) => (
      <SWRConfig value={{ provider: () => cache, dedupingInterval: 0 }}>
        <WalletContext.Provider value={value}>
          <BalanceProvider service={service}>
            <Balances />
          </BalanceProvider>
        </WalletContext.Provider>
      </SWRConfig>
    );
    const { rerender } = render(ui(wallets));
    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toBe(
        '12345678901234567890/12345678901234567890/900/100',
      ),
    );
    rerender(ui({ ...wallets, solana: defaultWalletContextValue.solana }));
    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toBe('disconnected/disconnected/900/100'),
    );
    expect(fetchBalance).toHaveBeenCalledWith(
      expect.objectContaining({ chainId: ChainId.Solana, walletAddress: source }),
    );
  });
});
