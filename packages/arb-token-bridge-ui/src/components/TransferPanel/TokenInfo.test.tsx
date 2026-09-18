import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { getTokenOverride } from '../../app/api/crosschain-transfers/utils';
import type { ERC20BridgeToken } from '../../hooks/arbTokenBridge.types';
import { TokenType } from '../../hooks/arbTokenBridge.types';
import { createBridgeTestWrapper } from '../../test-utils/bridge-test-wrapper';
import { ChainId } from '../../types/ChainId';
import { shortenAddress } from '../../util/CommonUtils';
import { LIFI_TRANSFER_LIST_ID, tokenListTokenToBridgeToken } from '../../util/TokenListUtils';
import { getUsdValueForAmount } from '../../util/TokenPriceUtils';
import type { SafeImageProps } from '../common/SafeImage';
import { BlockExplorerTokenLink } from './BlockExplorerTokenLink';
import { TokenInfo } from './TokenInfo';

vi.mock('../../util/featureFlag', async (actual) => ({
  ...(await actual<typeof import('../../util/featureFlag')>()),
  isSolanaEnabled: () => true,
  isLifiEnabled: () => true,
}));

const mint = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const token: ERC20BridgeToken = {
  address: mint,
  name: 'USD Coin',
  symbol: 'USDC',
  decimals: 6,
  type: TokenType.ERC20,
  listIds: new Set(),
  logoURI: '/mint.svg',
};

vi.mock('../common/SafeImage', () => ({
  SafeImage: ({ src, alt }: SafeImageProps) => <img src={src} alt={alt} />,
}));

afterEach(cleanup);

describe.sequential('mint address compatibility', () => {
  it('keeps the mint key and its own decimals when converting a token list', () => {
    const converted = tokenListTokenToBridgeToken({
      token: {
        chainId: ChainId.Solana,
        address: mint,
        name: 'USD Coin',
        symbol: 'USDC',
        decimals: 6,
      },
      listId: LIFI_TRANSFER_LIST_ID,
      parentChainId: ChainId.Solana,
      childChainId: ChainId.ArbitrumOne,
    });
    expect(converted).toMatchObject({
      address: mint,
      decimals: 6,
      lifiOnlyChainId: ChainId.Solana,
    });
    expect(converted?.l2Address).toBeUndefined();
    expect(
      tokenListTokenToBridgeToken({
        token: {
          chainId: ChainId.ArbitrumOne,
          address: '0x1111111111111111111111111111111111111111',
          name: 'USD Coin',
          symbol: 'USDC',
          decimals: 18,
        },
        listId: LIFI_TRANSFER_LIST_ID,
        parentChainId: ChainId.Solana,
        childChainId: ChainId.ArbitrumOne,
      })?.decimals,
    ).toBe(18);
  });

  it('uses the case-sensitive mint key for price lookup', () => {
    expect(
      getUsdValueForAmount({
        amount: 2,
        selectedToken: token,
        nativeCurrency: { name: 'Solana', symbol: 'SOL', decimals: 9, isCustom: false },
        tokensFromLists: { [mint]: { ...token, priceUSD: 1.5 } },
      }),
    ).toBe(3);
  });

  it('preserves the mint in the token display, logo lookup, and explorer URL', () => {
    render(<TokenInfo token={token} showFullAddress />, {
      wrapper: createBridgeTestWrapper({
        query: { sourceChain: ChainId.Solana, destinationChain: ChainId.ArbitrumOne },
        cacheEntries: [
          [[[], ChainId.Solana, ChainId.ArbitrumOne, 'useTokensFromLists'], { [mint]: token }],
        ],
      }),
    });
    expect(screen.getByRole('link').textContent).toBe(mint);
    expect(screen.getByRole('link').getAttribute('href')).toBe('https://solscan.io/token/' + mint);
    expect(screen.getByRole('img').getAttribute('src')).toBe(
      getTokenOverride({
        fromToken: mint,
        sourceChainId: ChainId.Solana,
        destinationChainId: ChainId.ArbitrumOne,
      }).source?.logoURI,
    );
  });

  it('preserves casing in shortened explorer links', () => {
    render(<BlockExplorerTokenLink chainId={ChainId.Solana} address={mint} />);
    expect(screen.getByRole('link').textContent).toBe(shortenAddress(mint));
    expect(screen.getByRole('link').getAttribute('href')).toBe('https://solscan.io/token/' + mint);
  });
});
