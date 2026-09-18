import { cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { BigNumber } from 'ethers';
import type { PropsWithChildren } from 'react';
import { SWRConfig } from 'swr';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useSourceChainNativeCurrencyDecimals } from '../../hooks/useSourceChainNativeCurrencyDecimals';
import { ChainId } from '../../types/ChainId';
import { LIFI_TRANSFER_LIST_ID, tokenListTokenToBridgeToken } from '../../util/TokenListUtils';
import { getChainMetadata } from '../../util/networkMetadata';
import { TokenRow } from './TokenRow';

const networkFixture = vi.hoisted(() => ({ destination: 42161 }));
vi.mock('../../hooks/useNetworks', () => ({
  useNetworks: () => [
    {
      sourceChain: getChainMetadata(ChainId.Solana),
      destinationChain: getChainMetadata(networkFixture.destination),
    },
  ],
}));
vi.mock('../../hooks/useSelectedToken', () => ({ useSelectedToken: () => [null, vi.fn()] }));
vi.mock('../../hooks/useAccountType', () => ({ useAccountType: () => ({ isLoading: false }) }));
vi.mock('../../hooks/useETHPrice', () => ({ useETHPrice: () => ({ ethPrice: 2000 }) }));
vi.mock('../../state', () => ({
  useAppState: () => ({ app: { arbTokenBridge: { bridgeTokens: undefined } } }),
}));
vi.mock('./TokenSearchUtils', () => ({ useTokensFromLists: () => ({ data: {} }) }));
vi.mock('./TokenInfo', () => ({ TokenLogoFallback: () => null }));
vi.mock('../../services/evm/nativeCurrency', () => ({
  fetchEvmNativeCurrency: () => {
    throw new Error('RPC unavailable in this test');
  },
}));
vi.mock('../../token-bridge-sdk/utils', () => ({
  getProviderForChainId: () => {
    throw new Error('No live RPC');
  },
}));
const wrapper = ({ children }: PropsWithChildren) => (
  <SWRConfig value={{ provider: () => new Map(), shouldRetryOnError: false }}>{children}</SWRConfig>
);
afterEach(cleanup);
describe.sequential('shared source token row', () => {
  it.each([ChainId.ArbitrumOne, ChainId.ApeChain, ChainId.Superposition])(
    'renders native SOL with nine decimals when depositing to %s',
    (destination) => {
      networkFixture.destination = destination;
      const select = vi.fn();
      render(
        <TokenRow token={null} balance={BigNumber.from('1230000000')} onTokenSelected={select} />,
        { wrapper },
      );
      expect(screen.getByText('SOL')).toBeTruthy();
      expect(screen.getByText('Native token on Solana')).toBeTruthy();
      expect(screen.getByText(/1.23/)).toBeTruthy();
      expect(screen.queryByText('$2,460.00')).toBeNull();
      fireEvent.click(screen.getByRole('button'));
      expect(select).toHaveBeenCalledWith(null, BigNumber.from('1230000000'));
      const { result } = renderHook(() => useSourceChainNativeCurrencyDecimals(), { wrapper });
      expect(result.current).toBe(9);
    },
  );
  it('retains a mint address and its source decimals in the existing token row', () => {
    const address = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
    const token = tokenListTokenToBridgeToken({
      token: { address, name: 'USD Coin', symbol: 'USDC', decimals: 6, chainId: ChainId.Solana },
      listId: LIFI_TRANSFER_LIST_ID,
      parentChainId: ChainId.Solana,
      childChainId: ChainId.ArbitrumOne,
    });
    expect(token?.address).toBe(address);
    expect(token?.decimals).toBe(6);
    if (!token) throw new Error('Expected a listed token');
    const select = vi.fn();
    render(
      <TokenRow token={token} balance={BigNumber.from('1234500')} onTokenSelected={select} />,
      { wrapper },
    );
    expect(screen.getByText(/1.2345/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button'));
    expect(select.mock.calls[0]?.[0]?.address).toBe(address);
  });

  it('renders the EVM destination native row alongside a Solana source', () => {
    networkFixture.destination = ChainId.ArbitrumOne;
    render(
      <TokenRow
        token={null}
        balance={BigNumber.from('1000000000000000000')}
        onTokenSelected={vi.fn()}
        isDestination
      />,
      { wrapper },
    );
    expect(screen.getByText('ETH')).toBeTruthy();
    expect(screen.getByText('Native token on Arbitrum One')).toBeTruthy();
    expect(screen.getByText(/2,000/)).toBeTruthy();
    expect(screen.queryByText('SOL')).toBeNull();
  });
});
