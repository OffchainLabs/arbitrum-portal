import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ChainId } from '../../types/ChainId';
import { useSyncConnectedChainToQueryParams } from './useSyncConnectedChainToQueryParams';

const safeAddress = '0x1111111111111111111111111111111111111111';
const solanaAddress = 'Hgw1pNJDYm5NbMheUHFNniiqtncor73swrH4RSN9APu5';

const mocks = vi.hoisted(() => ({
  query: {} as { sourceChain?: number; destinationChain?: number },
  sourceWallet: {
    address: undefined as string | undefined,
    chainId: undefined as number | undefined,
  },
  setQueryParams: vi.fn(),
}));

vi.mock('../../hooks/useArbQueryParams', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../hooks/useArbQueryParams')>()),
  useArbQueryParams: () => [mocks.query, mocks.setQueryParams],
}));
vi.mock('../../hooks/useDisabledFeatures', () => ({
  useDisabledFeatures: () => ({ isFeatureDisabled: () => false }),
}));
vi.mock('../../wallet/hooks/useWallets', () => ({
  useWallets: () => ({ sourceWallet: { account: mocks.sourceWallet } }),
}));
// Only the Safe address is a smart contract wallet
vi.mock('../../hooks/useAccountType', () => ({
  useAccountType: (address?: string) => ({
    accountType: address === safeAddress ? 'smart-contract-wallet' : 'externally-owned-account',
    isLoading: false,
  }),
}));

afterEach(() => {
  cleanup();
  mocks.query = {};
  mocks.sourceWallet = { address: undefined, chainId: undefined };
  mocks.setQueryParams.mockClear();
});

describe.sequential('useSyncConnectedChainToQueryParams', () => {
  it("moves the source chain to a source Safe's chain", () => {
    mocks.query = { sourceChain: ChainId.Ethereum, destinationChain: ChainId.ArbitrumOne };
    mocks.sourceWallet = { address: safeAddress, chainId: ChainId.ArbitrumOne };
    renderHook(useSyncConnectedChainToQueryParams);
    expect(mocks.setQueryParams).toHaveBeenCalledWith(
      expect.objectContaining({ sourceChain: ChainId.ArbitrumOne }),
    );
  });

  it('keeps a Solana source when a Safe is only the destination wallet', () => {
    mocks.query = { sourceChain: ChainId.Solana, destinationChain: ChainId.ArbitrumOne };
    mocks.sourceWallet = { address: solanaAddress, chainId: ChainId.Solana };
    renderHook(useSyncConnectedChainToQueryParams);
    expect(mocks.setQueryParams).not.toHaveBeenCalled();
  });

  it("syncs the source wallet's chain when the URL has no chains", () => {
    mocks.sourceWallet = { address: undefined, chainId: ChainId.ArbitrumOne };
    renderHook(useSyncConnectedChainToQueryParams);
    expect(mocks.setQueryParams).toHaveBeenCalledWith(
      expect.objectContaining({ sourceChain: ChainId.ArbitrumOne }),
    );
  });
});
