import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { createWalletTestWrapper } from '../test-utils/wallet-test-wrapper';
import { getProviderForChainId } from '../token-bridge-sdk/utils';
import { ChainId } from '../types/ChainId';
import { defaultWalletContextValue } from '../wallet/WalletContext';
import { useWallets } from '../wallet/hooks/useWallets';
import { useNetworks } from './useNetworks';

vi.mock('../token-bridge-sdk/utils', async (actual) => ({
  ...(await actual<typeof import('../token-bridge-sdk/utils')>()),
  getProviderForChainId: vi.fn(() => {
    throw new Error('Shared metadata requested an EVM provider');
  }),
}));
vi.mock('../util/featureFlag', () => ({ isSolanaEnabled: () => true, isLifiEnabled: () => true }));
describe('shared network boundary', () => {
  it('selects Solana metadata and its injected wallet without requesting EVM providers', () => {
    const wallets = {
      ...defaultWalletContextValue,
      solana: {
        ...defaultWalletContextValue.solana,
        account: {
          ...defaultWalletContextValue.solana.account,
          address: 'So11111111111111111111111111111111111111112',
        },
      },
    };
    const { result } = renderHook(() => ({ networks: useNetworks()[0], wallets: useWallets() }), {
      wrapper: createWalletTestWrapper({
        wallets,
        query: { sourceChain: ChainId.Solana, destinationChain: ChainId.ArbitrumOne },
      }),
    });
    expect(result.current.networks.sourceChain.id).toBe(ChainId.Solana);
    expect(Object.keys(result.current.networks).sort()).toEqual([
      'destinationChain',
      'sourceChain',
    ]);
    expect(result.current.wallets.sourceWallet).toBe(wallets.solana);
    expect(result.current.wallets.destinationWallet).toBe(wallets.evm);
    expect(getProviderForChainId).not.toHaveBeenCalled();
  });
});
