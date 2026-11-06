import { describe, expect, it, vi } from 'vitest';

import { ChainId } from '../../types/ChainId';
import { evmBalanceClient } from './evm';
import { getBalanceClient } from './getBalanceClient';
import { solanaBalanceClient } from './solana';

vi.mock('./evm', () => ({ evmBalanceClient: { fetchBalance: vi.fn() } }));
vi.mock('./solana', () => ({ solanaBalanceClient: { fetchBalance: vi.fn() } }));

describe('getBalanceClient', () => {
  it('selects a balance client from the chain ecosystem', () => {
    expect(getBalanceClient(ChainId.Ethereum)).toBe(evmBalanceClient);
    expect(getBalanceClient(ChainId.Solana)).toBe(solanaBalanceClient);
  });

  it('rejects unknown chains', () => {
    expect(() => getBalanceClient(999_999_999)).toThrow();
  });
});
