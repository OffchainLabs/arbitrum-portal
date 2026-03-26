import { describe, expect, it } from 'vitest';

import { CommonAddress } from '../../util/CommonAddressUtils';
import { LIFI_TRANSFER_LIST_ID, TokenListWithId } from '../../util/TokenListUtils';
import { tokenListsToSearchableTokenStorage } from './TokenSearchUtils';

describe('tokenListsToSearchableTokenStorage', () => {
  it('prefers L1 display metadata when an L2 token entry is processed first', () => {
    const tokens = tokenListsToSearchableTokenStorage(
      [
        {
          bridgeTokenListId: LIFI_TRANSFER_LIST_ID,
          l2ChainId: '42161',
          name: 'LiFi Tokens',
          timestamp: '2025-01-01T00:00:00.000Z',
          version: {
            major: 1,
            minor: 0,
            patch: 0,
          },
          tokens: [
            {
              chainId: 42161,
              address: CommonAddress.ArbitrumOne.PYUSDOFT,
              name: 'PYUSD OFT',
              symbol: 'PYUSD',
              decimals: 6,
              logoURI: 'https://example.com/blue.png',
              extensions: {
                bridgeInfo: {
                  '1': {
                    tokenAddress: CommonAddress.Ethereum.PYUSD,
                    name: 'PYUSD',
                    symbol: 'PYUSD',
                    decimals: 6,
                    logoURI: 'https://example.com/black.png',
                  },
                },
              },
            },
            {
              chainId: 1,
              address: CommonAddress.Ethereum.PYUSD,
              name: 'PYUSD',
              symbol: 'PYUSD',
              decimals: 6,
              logoURI: 'https://example.com/black.png',
            },
          ],
          keywords: [],
        } satisfies TokenListWithId,
      ],
      '1',
      '42161',
    );

    expect(tokens[CommonAddress.Ethereum.PYUSD]).toMatchObject({
      address: CommonAddress.Ethereum.PYUSD,
      name: 'PYUSD',
      logoURI: 'https://example.com/black.png',
      l2Address: CommonAddress.ArbitrumOne.PYUSDOFT,
    });
  });

  it('overwrites earlier display metadata when the LiFi entry arrives later', () => {
    const tokens = tokenListsToSearchableTokenStorage(
      [
        {
          bridgeTokenListId: 'legacy-list',
          l2ChainId: '42161',
          name: 'Legacy Tokens',
          timestamp: '2025-01-01T00:00:00.000Z',
          version: {
            major: 1,
            minor: 0,
            patch: 0,
          },
          tokens: [
            {
              chainId: 1,
              address: CommonAddress.Ethereum.PYUSD,
              name: 'PYUSD OFT',
              symbol: 'PYUSD',
              decimals: 6,
              logoURI: 'https://example.com/blue.png',
            },
          ],
          keywords: [],
        } satisfies TokenListWithId,
        {
          bridgeTokenListId: LIFI_TRANSFER_LIST_ID,
          l2ChainId: '42161',
          name: 'LiFi Tokens',
          timestamp: '2025-01-01T00:00:00.000Z',
          version: {
            major: 1,
            minor: 0,
            patch: 0,
          },
          tokens: [
            {
              chainId: 42161,
              address: CommonAddress.ArbitrumOne.PYUSDOFT,
              name: 'PYUSD OFT',
              symbol: 'PYUSD',
              decimals: 6,
              logoURI: 'https://example.com/blue.png',
              extensions: {
                bridgeInfo: {
                  '1': {
                    tokenAddress: CommonAddress.Ethereum.PYUSD,
                    name: 'PYUSD',
                    symbol: 'PYUSD',
                    decimals: 6,
                    logoURI: 'https://example.com/black.png',
                  },
                },
              },
            },
          ],
          keywords: [],
        } satisfies TokenListWithId,
      ],
      '1',
      '42161',
    );

    expect(tokens[CommonAddress.Ethereum.PYUSD]).toMatchObject({
      address: CommonAddress.Ethereum.PYUSD,
      name: 'PYUSD',
      logoURI: 'https://example.com/black.png',
      l2Address: CommonAddress.ArbitrumOne.PYUSDOFT,
    });
  });
});
