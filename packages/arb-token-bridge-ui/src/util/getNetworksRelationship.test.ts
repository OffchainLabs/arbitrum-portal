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
      label: 'Robinhood Chain to ApeChain sibling transfer',
      sourceChainId: ChainId.RobinhoodChain,
      destinationChainId: ChainId.ApeChain,
      expected: {
        parentChainId: ChainId.RobinhoodChain,
        childChainId: ChainId.ApeChain,
        isDepositMode: true,
      },
    },
    {
      label: 'ApeChain to Robinhood Chain sibling transfer',
      sourceChainId: ChainId.ApeChain,
      destinationChainId: ChainId.RobinhoodChain,
      expected: {
        parentChainId: ChainId.RobinhoodChain,
        childChainId: ChainId.ApeChain,
        isDepositMode: false,
      },
    },
  ])('resolves $label', ({ sourceChainId, destinationChainId, expected }) => {
    expect(getNetworksRelationship({ sourceChainId, destinationChainId })).toEqual(expected);
  });
});
