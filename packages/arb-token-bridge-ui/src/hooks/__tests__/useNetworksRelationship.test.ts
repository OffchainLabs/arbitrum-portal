import { registerCustomArbitrumNetwork } from '@arbitrum/sdk';
import { renderHook } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vitest';

import { ChainId } from '../../types/ChainId';
import { getChainMetadata } from '../../util/networkMetadata';
import { orbitMainnets } from '../../util/orbitChainsList';
import { useNetworksRelationship } from '../useNetworksRelationship';

type RelationshipCase = {
  label: string;
  sourceChainId: ChainId;
  destinationChainId: ChainId;
  isDepositMode: boolean;
};

/**
 * The hook derives the parent/child chains purely from
 * `isDepositMode`: on a deposit the source is the parent and the destination the
 * child; on a withdrawal it's reversed. LiFi "sibling" pairs override the
 * deposit/withdrawal direction (the designated parent is treated as the "from"
 * side of a deposit); everything else falls back to the canonical direction.
 */
const cases: RelationshipCase[] = [
  // Robinhood Chain LiFi sibling pairs.
  {
    label: 'Ethereum -> Robinhood Chain is a deposit',
    sourceChainId: ChainId.Ethereum,
    destinationChainId: ChainId.RobinhoodChain,
    isDepositMode: true,
  },
  {
    label: 'Robinhood Chain -> Ethereum is a withdrawal',
    sourceChainId: ChainId.RobinhoodChain,
    destinationChainId: ChainId.Ethereum,
    isDepositMode: false,
  },
  {
    label: 'Arbitrum One -> Robinhood Chain is a deposit',
    sourceChainId: ChainId.ArbitrumOne,
    destinationChainId: ChainId.RobinhoodChain,
    isDepositMode: true,
  },
  {
    label: 'Robinhood Chain -> Arbitrum One is a withdrawal',
    sourceChainId: ChainId.RobinhoodChain,
    destinationChainId: ChainId.ArbitrumOne,
    isDepositMode: false,
  },
  {
    label: 'Base -> Robinhood Chain is a deposit',
    sourceChainId: ChainId.Base,
    destinationChainId: ChainId.RobinhoodChain,
    isDepositMode: true,
  },
  // Nova -> Arbitrum One sibling (Nova is the parent).
  {
    label: 'Arbitrum Nova -> Arbitrum One treats Nova as parent (deposit)',
    sourceChainId: ChainId.ArbitrumNova,
    destinationChainId: ChainId.ArbitrumOne,
    isDepositMode: true,
  },
  // Canonical pairs (no sibling override; falls back to the isDepositMode util).
  {
    label: 'Ethereum -> Arbitrum One is a canonical deposit',
    sourceChainId: ChainId.Ethereum,
    destinationChainId: ChainId.ArbitrumOne,
    isDepositMode: true,
  },
  {
    label: 'Arbitrum One -> Ethereum is a canonical withdrawal',
    sourceChainId: ChainId.ArbitrumOne,
    destinationChainId: ChainId.Ethereum,
    isDepositMode: false,
  },
];

describe('useNetworksRelationship', () => {
  beforeAll(() => {
    try {
      const robinhoodChain = orbitMainnets[ChainId.RobinhoodChain];
      if (robinhoodChain) {
        registerCustomArbitrumNetwork(robinhoodChain);
      }
    } catch {
      // already registered
    }
  });

  it.each(cases)('$label', ({ sourceChainId, destinationChainId, isDepositMode }) => {
    const sourceChain = getChainMetadata(sourceChainId);
    const destinationChain = getChainMetadata(destinationChainId);

    const { result } = renderHook(() =>
      useNetworksRelationship({
        sourceChain,
        destinationChain,
      }),
    );

    expect(result.current).not.toHaveProperty('parentChainProvider');
    expect(result.current).not.toHaveProperty('childChainProvider');
    expect(result.current.isDepositMode).toBe(isDepositMode);

    if (isDepositMode) {
      // Deposit: source is the parent, destination is the child.
      expect(result.current.parentChain).toBe(sourceChain);
      expect(result.current.childChain).toBe(destinationChain);
    } else {
      // Withdrawal: destination is the parent, source is the child.
      expect(result.current.parentChain).toBe(destinationChain);
      expect(result.current.childChain).toBe(sourceChain);
    }
  });
});
