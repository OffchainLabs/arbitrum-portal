import { describe, expect, it } from 'vitest';

import { ChainId } from '../types/ChainId';
import { getWalletEcosystem, isCrossEcosystemTransfer } from './getWalletEcosystem';

describe('getWalletEcosystem', () => {
  it('returns the registered ecosystem for supported chains', () => {
    expect(getWalletEcosystem(ChainId.Ethereum)).toBe('evm');
    expect(getWalletEcosystem(ChainId.Solana)).toBe('solana');
  });

  it('rejects an unregistered chain', () => {
    expect(() => getWalletEcosystem(999_999_999)).toThrow('Unexpected chain id');
  });
});

describe('isCrossEcosystemTransfer', () => {
  it.each([
    { sourceChainId: ChainId.Solana, destinationChainId: ChainId.ArbitrumOne, expected: true },
    { sourceChainId: ChainId.Ethereum, destinationChainId: ChainId.ArbitrumOne, expected: false },
    // An unknown chain counts as the same ecosystem as the other side
    { sourceChainId: ChainId.Solana, destinationChainId: 999_999_999, expected: false },
  ])(
    'returns $expected from $sourceChainId to $destinationChainId',
    ({ sourceChainId, destinationChainId, expected }) => {
      expect(isCrossEcosystemTransfer({ sourceChainId, destinationChainId })).toBe(expected);
    },
  );
});
