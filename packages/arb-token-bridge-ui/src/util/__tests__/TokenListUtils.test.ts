import { describe, expect, it } from 'vitest';

import { ChainId } from '../../types/ChainId';
import {
  getBridgeTokenListsForNetworks,
  getDefaultBridgeTokenLists,
  getLifiTokenListForNetworks,
} from '../TokenListUtils';

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

  it('selects the LiFi token list by transfer direction', () => {
    const directList = getLifiTokenListForNetworks({
      sourceChainId: ChainId.RobinhoodChain,
      destinationChainId: ChainId.Ethereum,
    });
    const [selectedList] = getBridgeTokenListsForNetworks({
      parentChainId: ChainId.Ethereum,
      childChainId: ChainId.RobinhoodChain,
      sourceChainId: ChainId.RobinhoodChain,
      destinationChainId: ChainId.Ethereum,
    }).filter((list) => list.parentChainID !== undefined);

    expect(selectedList).toBe(directList);
    expect(selectedList?.url).toContain(
      `parentChainId=${ChainId.RobinhoodChain}&childChainId=${ChainId.Ethereum}`,
    );
  });

  it('filters to default lists when requested', () => {
    const lists = getDefaultBridgeTokenLists({
      childChainId: ChainId.ArbitrumOne,
      parentChainId: ChainId.Ethereum,
    });

    expect(lists.every((list) => list.isDefault)).toBe(true);
  });
});
