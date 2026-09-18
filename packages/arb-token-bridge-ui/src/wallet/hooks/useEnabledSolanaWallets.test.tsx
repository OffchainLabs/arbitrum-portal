import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createWalletTestWrapper } from '../../test-utils/wallet-test-wrapper';
import { ChainId } from '../../types/ChainId';
import type { EvmWalletHandle, SolanaWalletHandle } from '../types';
import { useWallets } from './useWallets';

vi.mock('../../util/featureFlag', async (actual) => ({
  ...(await actual<typeof import('../../util/featureFlag')>()),
  isSolanaEnabled: () => true,
  isLifiEnabled: () => true,
}));

const evm: EvmWalletHandle = {
  ecosystem: 'evm',
  account: {
    ecosystem: 'evm',
    address: '0x1234567890123456789012345678901234567890',
    chainId: ChainId.ArbitrumOne,
    status: 'connected',
  },
  isConnected: true,
  disconnect: async () => {},
};
const solana: SolanaWalletHandle = {
  ecosystem: 'solana',
  account: {
    ecosystem: 'solana',
    address: 'So11111111111111111111111111111111111111112',
    status: 'connected',
  },
  isConnected: true,
  disconnect: async () => {},
};

afterEach(cleanup);
describe('enabled Solana wallet selection', () => {
  it('selects the Solana source independently of the EVM destination', () => {
    const { result } = renderHook(useWallets, {
      wrapper: createWalletTestWrapper({
        wallets: { evm, solana },
        query: { sourceChain: ChainId.Solana, destinationChain: ChainId.ArbitrumOne },
      }),
    });
    expect(result.current.sourceWallet).toBe(solana);
    expect(result.current.destinationWallet).toBe(evm);
  });
});
