import { describe, expect, it } from 'vitest';

import { TokenType } from '../../hooks/arbTokenBridge.types';
import { CommonAddress } from '../../util/CommonAddressUtils';
import { PYUSD_BLACK_LOGO_URI, PYUSD_BLUE_LOGO_URI } from '../../util/PyusdUtils';
import { getTokenRowLogoURI } from './TokenRow';

describe('getTokenRowLogoURI', () => {
  it('keeps the token-list logo for equivalent destination PayPal USD entries', () => {
    expect(
      getTokenRowLogoURI({
        token: {
          type: TokenType.ERC20,
          address: CommonAddress.Ethereum.PYUSD,
          decimals: 6,
          name: 'PayPal USD',
          symbol: 'PYUSD',
          logoURI: PYUSD_BLACK_LOGO_URI,
          listIds: new Set(['lifi']),
        },
        overrideToken: {
          type: TokenType.ERC20,
          address: CommonAddress.ArbitrumOne.PYUSD,
          importLookupAddress: CommonAddress.Ethereum.PYUSD,
          decimals: 6,
          name: 'PayPal USD',
          symbol: 'PYUSD',
          logoURI: PYUSD_BLUE_LOGO_URI,
          listIds: new Set(),
        },
        nativeCurrencyLogoUrl: '/images/EthereumLogoRound.svg',
        isDestination: true,
      }),
    ).toBe(PYUSD_BLACK_LOGO_URI);
  });

  it('still uses the override logo for different destination assets', () => {
    expect(
      getTokenRowLogoURI({
        token: {
          type: TokenType.ERC20,
          address: CommonAddress.Ethereum.USDC,
          decimals: 6,
          name: 'USDC',
          symbol: 'USDC',
          logoURI: 'https://example.com/source.png',
          listIds: new Set(['lifi']),
        },
        overrideToken: {
          type: TokenType.ERC20,
          address: CommonAddress.ArbitrumOne.USDC,
          decimals: 6,
          name: 'USDC',
          symbol: 'USDC',
          logoURI: 'https://example.com/destination.png',
          listIds: new Set(),
        },
        nativeCurrencyLogoUrl: '/images/EthereumLogoRound.svg',
        isDestination: true,
      }),
    ).toBe('https://example.com/destination.png');
  });
});
