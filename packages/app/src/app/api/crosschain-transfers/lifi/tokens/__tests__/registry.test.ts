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

  it('adds canonical VIRTUAL separately when LiFi only returns the regular token', async () => {
    const virtualLogo =
      'https://static.debank.com/image/eth_token/logo_url/0x44ff8620b8ca30902395a7bd3f2407e1a091bf73/cbb70834d9442214c846833e47648255.png';
    const ethereumVirtual = {
      ...virtualToken(CommonAddress.Ethereum.VIRTUAL, ChainId.Ethereum),
      logoURI: virtualLogo,
    };
    const regularVirtual = {
      ...virtualToken(CommonAddress.RobinhoodChain.VIRTUAL, ChainId.RobinhoodChain),
      logoURI: undefined,
    };
    getTokens.mockResolvedValue({
      tokens: {
        [ChainId.Ethereum]: [ethereumVirtual],
        [ChainId.RobinhoodChain]: [regularVirtual],
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
      { ...regularVirtual, coinKey: 'VIRTUAL', logoURI: virtualLogo },
      {
        address: CommonAddress.RobinhoodChain.VIRTUAL_CANONICAL,
        chainId: ChainId.RobinhoodChain,
        coinKey: 'VIRTUAL',
        decimals: 18,
        name: 'Virtual Protocol',
        symbol: 'VIRTUAL',
      },
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
        logoURI: virtualLogo,
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

    expect(canonicalToken.extensions).not.toHaveProperty('priceUSD');
    expect(lifiToken.extensions).toHaveProperty('priceUSD', regularVirtual.priceUSD);

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
        logoURI: virtualLogo,
      }),
    );
  });
});
