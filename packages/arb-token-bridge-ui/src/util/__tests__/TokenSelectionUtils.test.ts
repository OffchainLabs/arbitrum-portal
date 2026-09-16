import { describe, expect, it } from 'vitest';

import { ERC20BridgeToken, TokenType } from '../../hooks/arbTokenBridge.types';
import { CommonAddress } from '../CommonAddressUtils';
import {
  ARB_ONE_NATIVE_USDC_TOKEN,
  ARB_SEPOLIA_NATIVE_USDC_TOKEN,
  getTokenForRow,
} from '../TokenSelectionUtils';

function buildToken(overrides: Partial<ERC20BridgeToken> = {}): ERC20BridgeToken {
  return {
    name: 'USD Coin',
    type: TokenType.ERC20,
    symbol: 'USDC',
    decimals: 6,
    address: CommonAddress.Ethereum.USDC,
    listIds: new Set<string>(),
    ...overrides,
  };
}

describe('getTokenForRow', () => {
  const listedToken = buildToken({ symbol: 'USDT', address: CommonAddress.Ethereum.USDT });
  const importedToken = buildToken({ symbol: 'ARB', address: CommonAddress.ArbitrumOne.ARB });

  const defaultArgs = {
    tokensFromLists: { [listedToken.address]: listedToken },
    tokensFromUser: { [importedToken.address]: importedToken },
    isOrbitChain: false,
    usdcToken: null,
  };

  describe('for a token that is not Arbitrum native USDC', () => {
    it('resolves from the token lists first', () => {
      expect(getTokenForRow({ ...defaultArgs, address: listedToken.address })).toBe(listedToken);
    });

    it('falls back to user-imported tokens', () => {
      expect(getTokenForRow({ ...defaultArgs, address: importedToken.address })).toBe(
        importedToken,
      );
    });

    it('returns null for an unknown address', () => {
      expect(
        getTokenForRow({ ...defaultArgs, address: CommonAddress.Ethereum.VIRTUAL }),
      ).toBeNull();
    });

    it('prefers the list entry when both maps hold the address', () => {
      const userCopy = buildToken({ symbol: 'USDT-user', address: CommonAddress.Ethereum.USDT });
      expect(
        getTokenForRow({
          ...defaultArgs,
          address: listedToken.address,
          tokensFromUser: { [userCopy.address]: userCopy },
        }),
      ).toBe(listedToken);
    });
  });

  describe('for Arbitrum native USDC outside an Orbit route', () => {
    it('returns the Arbitrum One constant, which is on no token list', () => {
      expect(getTokenForRow({ ...defaultArgs, address: CommonAddress.ArbitrumOne.USDC })).toBe(
        ARB_ONE_NATIVE_USDC_TOKEN,
      );
    });

    it('returns the Arbitrum Sepolia constant', () => {
      expect(getTokenForRow({ ...defaultArgs, address: CommonAddress.ArbitrumSepolia.USDC })).toBe(
        ARB_SEPOLIA_NATIVE_USDC_TOKEN,
      );
    });
  });

  describe('for Arbitrum native USDC on an Orbit route', () => {
    const orbitArgs = {
      ...defaultArgs,
      address: CommonAddress.ArbitrumOne.USDC,
      isOrbitChain: true,
    };

    it('hides the row until the route-specific metadata resolves', () => {
      expect(getTokenForRow({ ...orbitArgs, usdcToken: null })).toBeNull();
    });

    it('uses the resolved canonical USDC metadata', () => {
      const usdcToken = buildToken({ l2Address: CommonAddress.ArbitrumOne.USDC });
      expect(getTokenForRow({ ...orbitArgs, usdcToken })).toBe(usdcToken);
    });
  });
});
