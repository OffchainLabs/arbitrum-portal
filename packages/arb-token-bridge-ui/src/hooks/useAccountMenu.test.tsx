import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createWalletTestWrapper } from '../test-utils/wallet-test-wrapper';
import { ChainId } from '../types/ChainId';
import type { SolanaAddress } from '../util/AddressUtils';
import { defaultWalletContextValue } from '../wallet/WalletContext';
import type { WalletContextValue } from '../wallet/types';
import { useAccountMenu } from './useAccountMenu';

const lookups = vi.hoisted(() => ({
  useEnsName: vi.fn<(params: { address?: string }) => { data: undefined }>(() => ({
    data: undefined,
  })),
  fromEthersProvider: vi.fn(() => ({ reverse: async () => 'wallet.crypto' })),
}));
vi.mock('wagmi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('wagmi')>()),
  useEnsName: lookups.useEnsName,
  useEnsAvatar: () => ({ data: undefined }),
}));
vi.mock('@unstoppabledomains/resolution', () => ({
  default: { fromEthersProvider: lookups.fromEthersProvider },
}));
vi.mock('@/token-bridge-sdk/utils', () => ({ getProviderForChainId: () => ({}) }));

const solanaAddress = 'Hgw1pNJDYm5NbMheUHFNniiqtncor73swrH4RSN9APu5' as SolanaAddress;
const evmAddress = '0x1111111111111111111111111111111111111111';

const wallets: WalletContextValue = {
  evm: {
    ...defaultWalletContextValue.evm,
    isConnected: true,
    account: { ecosystem: 'evm', status: 'connected', address: evmAddress, chainId: 1 },
  },
  solana: {
    ...defaultWalletContextValue.solana,
    isConnected: true,
    account: {
      ecosystem: 'solana',
      status: 'connected',
      address: solanaAddress,
      chainId: ChainId.Solana,
    },
  },
};

function renderAccountMenu(ecosystem: keyof WalletContextValue) {
  return renderHook(() => useAccountMenu(wallets[ecosystem]), {
    wrapper: createWalletTestWrapper({
      wallets,
      query: { sourceChain: ChainId.Ethereum, destinationChain: ChainId.ArbitrumOne },
    }),
  });
}

describe.sequential('useAccountMenu', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(cleanup);

  it('never looks up ENS or Unstoppable Domains names for a Solana wallet', async () => {
    const { result } = renderAccountMenu('solana');

    expect(result.current.address).toBe(solanaAddress);
    expect(lookups.useEnsName).toHaveBeenCalled();
    for (const [{ address }] of lookups.useEnsName.mock.calls) {
      expect(address).toBeUndefined();
    }
    // UD resolves in an effect, so give it a chance to run
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(lookups.fromEthersProvider).not.toHaveBeenCalled();
    expect(result.current.udInfo.name).toBeNull();
  });

  it('looks up ENS and Unstoppable Domains names for an EVM wallet', async () => {
    const { result } = renderAccountMenu('evm');

    expect(lookups.useEnsName).toHaveBeenCalledWith(
      expect.objectContaining({ address: evmAddress }),
    );
    await waitFor(() => expect(result.current.udInfo.name).toBe('wallet.crypto'));
  });
});
