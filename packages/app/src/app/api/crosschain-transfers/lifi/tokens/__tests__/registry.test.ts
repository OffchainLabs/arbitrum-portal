import { CoinKey, ChainId as LiFiChainId, type Token as LiFiToken } from '@lifi/sdk';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ChainId } from '@/bridge/types/ChainId';
import { CommonAddress } from '@/bridge/util/CommonAddressUtils';
import { LIFI_TRANSFER_LIST_ID, tokenListTokenToBridgeToken } from '@/bridge/util/TokenListUtils';

import { groupChildTokensAndParentTokens } from '../groupChildTokensAndParentTokens';
import { getLifiTokenRegistry } from '../registry';

const { getTokens } = vi.hoisted(() => ({ getTokens: vi.fn() }));

vi.mock('@lifi/sdk', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@lifi/sdk')>()),
  getTokens,
}));

vi.mock('next/cache', () => ({
  unstable_cache: (fetcher: () => unknown) => fetcher,
}));

function virtualToken(address: string, chainId: number, coinKey?: CoinKey): LiFiToken {
  return {
    address,
    chainId: chainId as LiFiChainId,
    coinKey,
    decimals: 18,
    logoURI: '',
    name: 'Virtual Protocol',
    priceUSD: '1',
    symbol: 'VIRTUAL',
  };
}

describe('getLifiTokenRegistry', () => {
  beforeEach(() => {
    getTokens.mockReset();
  });

  it('keeps canonical and LiFi Robinhood VIRTUAL tokens separate', async () => {
    const virtualLogo = 'https://example.com/virtual.png';
    const robinhoodVirtualLogo = 'https://example.com/robinhood-virtual.png';
    const ethereumVirtual = {
      ...virtualToken(CommonAddress.Ethereum.VIRTUAL, ChainId.Ethereum),
      logoURI: virtualLogo,
    };
    const regularVirtual = {
      ...virtualToken(CommonAddress.RobinhoodChain.VIRTUAL, ChainId.RobinhoodChain),
      logoURI: robinhoodVirtualLogo,
    };
    const canonicalVirtual = virtualToken(
      CommonAddress.RobinhoodChain.VIRTUAL_CANONICAL,
      ChainId.RobinhoodChain,
    );

    getTokens.mockResolvedValue({
      tokens: {
        [ChainId.Ethereum]: [ethereumVirtual],
        [ChainId.RobinhoodChain]: [regularVirtual, canonicalVirtual],
      },
    });

    const registry = await getLifiTokenRegistry();
    const tokens = groupChildTokensAndParentTokens({
      parentTokens: registry.tokensByChain[ChainId.Ethereum] ?? [],
      childTokens: registry.tokensByChain[ChainId.RobinhoodChain] ?? [],
      childTokensByCoinKey: registry.tokensByChainAndCoinKey[ChainId.RobinhoodChain] ?? {},
      parentChainId: ChainId.Ethereum,
      childChainId: ChainId.RobinhoodChain,
    });

    expect(registry.tokensByChain[ChainId.RobinhoodChain]).toEqual([
      { ...regularVirtual, coinKey: 'VIRTUAL' },
      { ...canonicalVirtual, coinKey: 'VIRTUAL' },
    ]);
    expect(tokens).toEqual([
      expect.objectContaining({
        address: CommonAddress.RobinhoodChain.VIRTUAL_CANONICAL,
        logoURI: virtualLogo,
        extensions: expect.objectContaining({
          bridgeInfo: {
            [ChainId.Ethereum]: expect.objectContaining({
              tokenAddress: CommonAddress.Ethereum.VIRTUAL,
            }),
          },
        }),
      }),
      expect.objectContaining({
        address: CommonAddress.RobinhoodChain.VIRTUAL,
        logoURI: robinhoodVirtualLogo,
        extensions: expect.not.objectContaining({
          bridgeInfo: expect.anything(),
        }),
      }),
    ]);

    const canonicalToken = tokens[0];
    const lifiToken = tokens[1];
    expect(canonicalToken).toBeDefined();
    expect(lifiToken).toBeDefined();
    if (!canonicalToken || !lifiToken) return;

    expect(
      tokenListTokenToBridgeToken({
        token: canonicalToken,
        listId: LIFI_TRANSFER_LIST_ID,
        parentChainId: ChainId.Ethereum,
        childChainId: ChainId.RobinhoodChain,
      }),
    ).toEqual(
      expect.objectContaining({
        address: CommonAddress.Ethereum.VIRTUAL,
        l2Address: CommonAddress.RobinhoodChain.VIRTUAL_CANONICAL,
        logoURI: virtualLogo,
      }),
    );
    expect(
      tokenListTokenToBridgeToken({
        token: lifiToken,
        listId: LIFI_TRANSFER_LIST_ID,
        parentChainId: ChainId.Ethereum,
        childChainId: ChainId.RobinhoodChain,
      }),
    ).toEqual(
      expect.objectContaining({
        address: CommonAddress.RobinhoodChain.VIRTUAL,
        l2Address: CommonAddress.RobinhoodChain.VIRTUAL,
        lifiOnlyChainId: ChainId.RobinhoodChain,
        logoURI: robinhoodVirtualLogo,
      }),
    );
  });
});
