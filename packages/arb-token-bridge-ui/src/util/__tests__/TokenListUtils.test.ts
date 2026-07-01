import { describe, expect, it } from 'vitest';

import { ChainId } from '../../types/ChainId';
import { CommonAddress } from '../CommonAddressUtils';
import {
  ROBINHOOD_CHAIN_TOKEN_LIST_ID,
  fetchBridgeTokenList,
  getBridgeTokenListsForNetworks,
  getDefaultBridgeTokenLists,
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

  it('filters to default lists when requested', () => {
    const lists = getDefaultBridgeTokenLists({
      childChainId: ChainId.ArbitrumOne,
      parentChainId: ChainId.Ethereum,
    });

    expect(lists.every((list) => list.isDefault)).toBe(true);
  });

  it('uses the hardcoded Robinhood Chain token list for Ethereum canonical transfers', async () => {
    const lists = getBridgeTokenListsForNetworks({
      childChainId: ChainId.RobinhoodChain,
      parentChainId: ChainId.Ethereum,
    });

    expect(lists.map((list) => list.id)).toContain(ROBINHOOD_CHAIN_TOKEN_LIST_ID);
    expect(
      lists.some(
        (list) =>
          list.url?.endsWith(`${ChainId.RobinhoodChain}_arbed_native_list.json`) ||
          list.url?.endsWith(`${ChainId.RobinhoodChain}_arbed_uniswap_labs.json`),
      ),
    ).toBe(false);

    const hardcodedList = lists.find((list) => list.id === ROBINHOOD_CHAIN_TOKEN_LIST_ID);
    expect(hardcodedList).toBeDefined();

    const { data } = await fetchBridgeTokenList(hardcodedList!);
    expect(data?.tokens.map((token) => token.address.toLowerCase())).toEqual([
      CommonAddress.RobinhoodChain.WETH,
      CommonAddress.RobinhoodChain.sUSDe,
      CommonAddress.RobinhoodChain.ENA,
      CommonAddress.RobinhoodChain.WEETH,
      CommonAddress.RobinhoodChain.WSTETH,
    ]);
  });

  it('keeps LiFi but excludes generated arbed lists for Robinhood routes', () => {
    const lists = getBridgeTokenListsForNetworks({
      childChainId: ChainId.RobinhoodChain,
      parentChainId: ChainId.ArbitrumOne,
    });

    expect(
      lists.some(
        (list) =>
          list.url?.endsWith(`${ChainId.RobinhoodChain}_arbed_native_list.json`) ||
          list.url?.endsWith(`${ChainId.RobinhoodChain}_arbed_uniswap_labs.json`),
      ),
    ).toBe(false);
  });
});
