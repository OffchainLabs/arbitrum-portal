import { describe, expect, it, vi } from 'vitest';

import { ChainId } from '../../types/ChainId';
import type { BalanceClient } from '../types';
import { createBalanceClientResolver } from './getBalanceClient';

const evm: BalanceClient = { fetchBalance: vi.fn() };
const solana: BalanceClient = { fetchBalance: vi.fn() };

describe('createBalanceClientResolver', () => {
  it('selects a balance client from the chain ecosystem', () => {
    const getBalanceClient = createBalanceClientResolver({ evm, solana });

    expect(getBalanceClient(ChainId.Ethereum)).toBe(evm);
    expect(getBalanceClient(ChainId.Solana)).toBe(solana);
  });

  it('rejects Solana when the runtime does not provide a client', () => {
    const getBalanceClient = createBalanceClientResolver({ evm });

    expect(() => getBalanceClient(ChainId.Solana)).toThrow(
      'Balance client is not available for solana.',
    );
  });

  it('rejects missing EVM registration and unknown chains', () => {
    expect(() => createBalanceClientResolver({ solana })(ChainId.Ethereum)).toThrow(
      'Balance client is not available for evm.',
    );
    expect(() => createBalanceClientResolver({ evm, solana })(999_999_999)).toThrow();
  });
});
