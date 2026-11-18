import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createBridgeTestWrapper } from '../test-utils/bridge-test-wrapper';
import { ChainId } from '../types/ChainId';
import { defaultWalletContextValue } from '../wallet/WalletContext';
import { type ERC20BridgeToken, TokenType } from './arbTokenBridge.types';
import { useBalanceOnSourceChain } from './useBalanceOnSourceChain';

afterEach(cleanup);

describe('useBalanceOnSourceChain', () => {
  it('returns zero for an undeployed child token without starting a balance request', () => {
    const fetchBalance = vi.fn();
    const token: ERC20BridgeToken = {
      address: '0x3333333333333333333333333333333333333333',
      name: 'Unbridged token',
      symbol: 'TKN',
      decimals: 18,
      type: TokenType.ERC20,
      listIds: new Set(),
    };
    const wrapper = createBridgeTestWrapper({
      query: { sourceChain: ChainId.ArbitrumOne, destinationChain: ChainId.Ethereum },
      wallets: {
        ...defaultWalletContextValue,
        evm: {
          ...defaultWalletContextValue.evm,
          isConnected: true,
          account: {
            ecosystem: 'evm',
            address: '0x1111111111111111111111111111111111111111',
            chainId: ChainId.ArbitrumOne,
            status: 'connected',
          },
        },
      },
      fetchBalance,
    });
    const { result } = renderHook(() => useBalanceOnSourceChain(token), { wrapper });
    expect(result.current?.isZero()).toBe(true);
    expect(fetchBalance).not.toHaveBeenCalled();
  });
});
