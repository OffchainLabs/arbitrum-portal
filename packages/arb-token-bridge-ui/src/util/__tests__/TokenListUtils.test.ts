import { describe, expect, it } from 'vitest';

import { ChainId } from '../../types/ChainId';
import { getBridgeTokenListsForNetworks, getDefaultBridgeTokenLists } from '../TokenListUtils';

describe('TokenListUtils helpers', () => {
  it('returns LiFi token list matching the active parent/child pair', () => {
    const lists = getBridgeTokenListsForNetworks({
      childChainId: ChainId.ArbitrumOne,
      parentChainId: ChainId.Ethereum,
    });

    const lifiLists = lists.filter((list) => list.parentChainID !== undefined);

    expect(lifiLists).toHaveLength(1);
    expect(lifiLists[0]?.originChainID).toBe(ChainId.ArbitrumOne);
    expect(lifiLists[0]?.parentChainID).toBe(ChainId.Ethereum);
  });

  it('includes optional non-default lists for the child chain', () => {
    const lists = getBridgeTokenListsForNetworks({
      childChainId: ChainId.ArbitrumOne,
      parentChainId: ChainId.Ethereum,
    });

    const nonDefaultIds = lists.filter((list) => !list.isDefault).map((list) => list.id);

    expect(nonDefaultIds).toContain('5');
  });

  it('filters to default lists when requested', () => {
    const lists = getDefaultBridgeTokenLists({
      childChainId: ChainId.ArbitrumOne,
      parentChainId: ChainId.Ethereum,
    });

    expect(lists.every((list) => list.isDefault)).toBe(true);
  });
});
