import { renderHook } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ChainId } from '../types/ChainId';
import { WalletContext, defaultWalletContextValue } from '../wallet/WalletContext';
import { useWallets } from '../wallet/hooks/useWallets';
import { useNetworks } from './useNetworks';

vi.mock('../token-bridge-sdk/utils', () => {
  throw new Error('Shared metadata loaded provider acquisition');
});
vi.mock('../util/chainUtils', () => ({ isSupportedChainId: () => true }));
vi.mock('../util/queryParamUtils', () => ({ sanitizeQueryParams: (params: unknown) => params }));
vi.mock('./useArbQueryParams', () => ({
  DisabledFeatures: { TRANSFERS_TO_NON_ARBITRUM_CHAINS: 'transfers-to-non-arbitrum-chains' },
  useArbQueryParams: () => [{ sourceChain: 1151111081099710, destinationChain: 42161 }, vi.fn()],
}));
vi.mock('./useDisabledFeatures', () => ({
  useDisabledFeatures: () => ({ isFeatureDisabled: () => false }),
}));

const wallets = {
  ...defaultWalletContextValue,
  solana: {
    ...defaultWalletContextValue.solana,
    account: { ...defaultWalletContextValue.solana.account, address: 'CaseSensitiveAccount' },
  },
};
function Wrapper({ children }: PropsWithChildren) {
  return <WalletContext.Provider value={wallets}>{children}</WalletContext.Provider>;
}

describe('shared network boundary', () => {
  it('selects Solana metadata and the injected wallet without loading EVM providers', () => {
    const { result } = renderHook(() => ({ networks: useNetworks()[0], wallets: useWallets() }), {
      wrapper: Wrapper,
    });
    expect(result.current.networks.sourceChain.id).toBe(ChainId.Solana);
    expect(Object.keys(result.current.networks).sort()).toEqual([
      'destinationChain',
      'sourceChain',
    ]);
    expect(result.current.wallets.sourceWallet).toBe(wallets.solana);
    expect(result.current.wallets.destinationWallet).toBe(wallets.evm);
  });
});
