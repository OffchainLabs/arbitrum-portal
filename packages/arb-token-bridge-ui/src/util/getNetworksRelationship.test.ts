import { describe, expect, it } from 'vitest';

import { ChainId } from '../types/ChainId';
import { getNetworksRelationship } from './getNetworksRelationship';

describe('getNetworksRelationship', () => {
  it.each([
    {
      label: 'normal deposit',
      sourceChainId: ChainId.Ethereum,
      destinationChainId: ChainId.ArbitrumOne,
      expected: {
        parentChainId: ChainId.Ethereum,
        childChainId: ChainId.ArbitrumOne,
        isDepositMode: true,
      },
    },
    {
      label: 'normal withdrawal',
      sourceChainId: ChainId.ArbitrumOne,
      destinationChainId: ChainId.Ethereum,
      expected: {
        parentChainId: ChainId.Ethereum,
        childChainId: ChainId.ArbitrumOne,
        isDepositMode: false,
      },
    },
    {
      label: 'Robinhood Chain to Superposition special deposit',
      sourceChainId: ChainId.RobinhoodChain,
      destinationChainId: ChainId.Superposition,
      expected: {
        parentChainId: ChainId.RobinhoodChain,
        childChainId: ChainId.Superposition,
        isDepositMode: true,
      },
    },
    {
      label: 'Superposition to Robinhood Chain special withdrawal',
      sourceChainId: ChainId.Superposition,
      destinationChainId: ChainId.RobinhoodChain,
      expected: {
        parentChainId: ChainId.RobinhoodChain,
        childChainId: ChainId.Superposition,
        isDepositMode: false,
      },
    },
    {
      label: 'Nova to ArbitrumOne sibling transfer',
      sourceChainId: ChainId.ArbitrumNova,
      destinationChainId: ChainId.ArbitrumOne,
      expected: {
        parentChainId: ChainId.ArbitrumNova,
        childChainId: ChainId.ArbitrumOne,
        isDepositMode: true,
      },
    },
    {
      label: 'ApeChain to Superposition special withdrawal',
      sourceChainId: ChainId.ApeChain,
      destinationChainId: ChainId.Superposition,
      expected: {
        parentChainId: ChainId.Superposition,
        childChainId: ChainId.ApeChain,
        isDepositMode: false,
      },
    },
    {
      label: 'Superposition to ApeChain special deposit',
      sourceChainId: ChainId.Superposition,
      destinationChainId: ChainId.ApeChain,
      expected: {
        parentChainId: ChainId.Superposition,
        childChainId: ChainId.ApeChain,
        isDepositMode: true,
      },
    },
  ])('resolves $label', ({ sourceChainId, destinationChainId, expected }) => {
    expect(getNetworksRelationship({ sourceChainId, destinationChainId })).toEqual(expected);
  });
});
