import { registerCustomArbitrumNetwork } from '@arbitrum/sdk';
import { StaticJsonRpcProvider } from '@ethersproject/providers';
import { renderHook } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vitest';
import { Chain } from 'wagmi/chains';

import { ChainId } from '../../types/ChainId';
import { orbitMainnets } from '../../util/orbitChainsList';
import { useNetworksRelationship } from '../useNetworksRelationship';

type RelationshipCase = {
  label: string;
  sourceChainId: ChainId;
  destinationChainId: ChainId;
  isDepositMode: boolean;
};

/**
 * The hook derives the parent/child chains (and their providers) purely from
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
  {
    label: 'Robinhood Chain -> Superposition treats Robinhood Chain as parent (deposit)',
    sourceChainId: ChainId.RobinhoodChain,
    destinationChainId: ChainId.Superposition,
    isDepositMode: true,
  },
  {
    label: 'Superposition -> Robinhood Chain is a withdrawal',
    sourceChainId: ChainId.Superposition,
    destinationChainId: ChainId.RobinhoodChain,
    isDepositMode: false,
  },
  // ApeChain <> Superposition sibling pair (Superposition is the parent).
  {
    label: 'Superposition -> ApeChain treats Superposition as parent (deposit)',
    sourceChainId: ChainId.Superposition,
    destinationChainId: ChainId.ApeChain,
    isDepositMode: true,
  },
  {
    label: 'ApeChain -> Superposition is a withdrawal',
    sourceChainId: ChainId.ApeChain,
    destinationChainId: ChainId.Superposition,
    isDepositMode: false,
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
    const sourceChain = { id: sourceChainId } as unknown as Chain;
    const destinationChain = { id: destinationChainId } as unknown as Chain;
    const sourceChainProvider = {} as unknown as StaticJsonRpcProvider;
    const destinationChainProvider = {} as unknown as StaticJsonRpcProvider;

    const { result } = renderHook(() =>
      useNetworksRelationship({
        sourceChain,
        sourceChainProvider,
        destinationChain,
        destinationChainProvider,
      }),
    );

    expect(result.current.isDepositMode).toBe(isDepositMode);

    if (isDepositMode) {
      // Deposit: source is the parent, destination is the child.
      expect(result.current.parentChain).toBe(sourceChain);
      expect(result.current.parentChainProvider).toBe(sourceChainProvider);
      expect(result.current.childChain).toBe(destinationChain);
      expect(result.current.childChainProvider).toBe(destinationChainProvider);
    } else {
      // Withdrawal: destination is the parent, source is the child.
      expect(result.current.parentChain).toBe(destinationChain);
      expect(result.current.parentChainProvider).toBe(destinationChainProvider);
      expect(result.current.childChain).toBe(sourceChain);
      expect(result.current.childChainProvider).toBe(sourceChainProvider);
    }
  });
});
