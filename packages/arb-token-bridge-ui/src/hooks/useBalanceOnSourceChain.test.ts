import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createBridgeTestWrapper } from '../test-utils/bridge-test-wrapper';
import { ChainId } from '../types/ChainId';
import { WalletContext, defaultWalletContextValue } from '../wallet/WalletContext';
import { SOLANA_NATIVE_TOKEN_ADDRESS } from '../wallet/constants';
import type { WalletContextValue } from '../wallet/types';
import { useBalanceOnSourceChain } from './useBalanceOnSourceChain';

vi.mock('../util/featureFlag', async (actual) => ({
  ...(await actual<typeof import('../util/featureFlag')>()),
  isSolanaEnabled: () => true,
  isLifiEnabled: () => true,
}));
afterEach(cleanup);
function Balance() {
  return createElement('output', {}, useBalanceOnSourceChain(null)?.toString() ?? 'disconnected');
}
describe('useBalanceOnSourceChain', () => {
  it('uses the Solana wallet and clears its balance on disconnect', async () => {
    const address = 'So11111111111111111111111111111111111111112';
    const wallets: WalletContextValue = {
      ...defaultWalletContextValue,
      solana: {
        ...defaultWalletContextValue.solana,
        isConnected: true,
        account: { ecosystem: 'solana', address, chainId: ChainId.Solana, status: 'connected' },
      },
    };
    const fetchBalance = vi.fn(async () => ({ [SOLANA_NATIVE_TOKEN_ADDRESS]: 123n }));
    const wrapper = createBridgeTestWrapper({
      query: { sourceChain: ChainId.Solana, destinationChain: ChainId.ArbitrumOne },
      fetchBalance,
    });
    const ui = (value: WalletContextValue) =>
      createElement(WalletContext.Provider, { value }, createElement(Balance));
    const { rerender } = render(ui(wallets), { wrapper });
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('123'));
    expect(fetchBalance).toHaveBeenCalledWith({
      chainId: ChainId.Solana,
      walletAddress: address,
      tokenAddresses: [SOLANA_NATIVE_TOKEN_ADDRESS],
    });
    rerender(ui(defaultWalletContextValue));
    expect(screen.getByRole('status').textContent).toBe('disconnected');
  });
});
