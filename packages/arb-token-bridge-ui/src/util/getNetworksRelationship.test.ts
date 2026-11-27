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
      label: 'Solana source deposit',
      sourceChainId: ChainId.Solana,
      destinationChainId: ChainId.ArbitrumOne,
      expected: {
        parentChainId: ChainId.Solana,
        childChainId: ChainId.ArbitrumOne,
        isDepositMode: true,
      },
    },
    {
      label: 'Arbitrum One to Elysium LiFi deposit',
      sourceChainId: ChainId.ArbitrumOne,
      destinationChainId: ChainId.Elysium,
      expected: {
        parentChainId: ChainId.ArbitrumOne,
        childChainId: ChainId.Elysium,
        isDepositMode: true,
      },
    },
    {
      label: 'Elysium to Arbitrum One LiFi transfer',
      sourceChainId: ChainId.Elysium,
      destinationChainId: ChainId.ArbitrumOne,
      expected: {
        parentChainId: ChainId.Elysium,
        childChainId: ChainId.ArbitrumOne,
        isDepositMode: true,
      },
    },
    {
      label: 'ApeChain to Elysium LiFi deposit',
      sourceChainId: ChainId.ApeChain,
      destinationChainId: ChainId.Elysium,
      expected: {
        parentChainId: ChainId.ApeChain,
        childChainId: ChainId.Elysium,
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
