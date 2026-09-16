import { describe, expect, it, vi } from 'vitest';

import { ChainId } from '../../types/ChainId';
import type { EvmBalanceClient, SolanaBalanceClient } from '../types';
import { createBalanceClientResolver } from './getBalanceClient';

const evm: EvmBalanceClient = { ecosystem: 'evm', fetchBalance: vi.fn() };
const solana: SolanaBalanceClient = { ecosystem: 'solana', fetchBalance: vi.fn() };

describe('createBalanceClientResolver', () => {
  it('selects a balance client from the chain ecosystem', () => {
    const getBalanceClient = createBalanceClientResolver({ evm, solana });

    expect(getBalanceClient(ChainId.Ethereum)).toBe(evm);
    expect(getBalanceClient(ChainId.Solana)).toBe(solana);
  });

  it('rejects Solana when the runtime does not provide a client', () => {
    const getBalanceClient = createBalanceClientResolver({ evm });

    expect(() => getBalanceClient(ChainId.Solana)).toThrow(
      'Solana balance client is not available.',
    );
  });
});
