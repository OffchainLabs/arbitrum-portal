import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createBridgeTestWrapper } from '../test-utils/bridge-test-wrapper';
import { ChainId } from '../types/ChainId';
import { WalletContext, defaultWalletContextValue } from '../wallet/WalletContext';
import type { WalletContextValue } from '../wallet/types';
import { type ERC20BridgeToken, TokenType } from './arbTokenBridge.types';
import { useArbQueryParams } from './useArbQueryParams';
import { useBalanceOnDestinationChain } from './useBalanceOnDestinationChain';

afterEach(cleanup);
const token = {
  address: '0x3333333333333333333333333333333333333333',
  l2Address: '0x4444444444444444444444444444444444444444',
  name: 'Token',
  symbol: 'TKN',
  decimals: 18,
  type: TokenType.ERC20,
  listIds: new Set<string>(),
} satisfies ERC20BridgeToken;
function Balance() {
  const balance = useBalanceOnDestinationChain(token);
  const [, setQuery] = useArbQueryParams();
  return createElement(
    'div',
    {},
    createElement('output', {}, balance?.toString() ?? 'disconnected'),
    createElement(
      'button',
      { onClick: () => setQuery({ destinationAddress: undefined }) },
      'Clear recipient',
    ),
  );
}
describe('useBalanceOnDestinationChain', () => {
  it('keeps custom recipient holdings after wallet disconnect and clears them when the recipient is removed', async () => {
    const address = '0x1111111111111111111111111111111111111111';
    const recipient = '0x2222222222222222222222222222222222222222';
    const wallets: WalletContextValue = {
      ...defaultWalletContextValue,
      evm: {
        ...defaultWalletContextValue.evm,
        isConnected: true,
        account: { ecosystem: 'evm', address, chainId: ChainId.ArbitrumOne, status: 'connected' },
      },
    };
    const fetchBalance = vi.fn(async () => ({ [token.l2Address]: 321n }));
    const wrapper = createBridgeTestWrapper({
      query: {
        sourceChain: ChainId.Ethereum,
        destinationChain: ChainId.ArbitrumOne,
        destinationAddress: recipient,
      },
      fetchBalance,
    });
    const ui = (value: WalletContextValue) =>
      createElement(WalletContext.Provider, { value }, createElement(Balance));
    const { rerender } = render(ui(wallets), { wrapper });
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('321'));
    expect(fetchBalance).toHaveBeenCalledWith({
      chainId: ChainId.ArbitrumOne,
      walletAddress: recipient,
      tokenAddresses: [token.l2Address],
    });
    rerender(ui(defaultWalletContextValue));
    expect(screen.getByRole('status').textContent).toBe('321');
    fireEvent.click(screen.getByRole('button', { name: 'Clear recipient' }));
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('disconnected'));
  });
});
