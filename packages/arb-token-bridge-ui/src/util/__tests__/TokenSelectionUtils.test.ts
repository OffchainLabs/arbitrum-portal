import { describe, expect, it } from 'vitest';

import { ERC20BridgeToken, TokenType } from '../../hooks/arbTokenBridge.types';
import { ChainId } from '../../types/ChainId';
import { CommonAddress } from '../CommonAddressUtils';
import { LIFI_TRANSFER_LIST_ID } from '../TokenListUtils';
import {
  ARB_ONE_NATIVE_USDC_TOKEN,
  ARB_SEPOLIA_NATIVE_USDC_TOKEN,
  getTokenForRow,
  isTokenDepositUnavailable,
  selectUsdcToken,
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

describe('isTokenDepositUnavailable', () => {
  // Ethereum USDC is withdraw-only on Robinhood Chain, so it is the canonical fixture here.
  const withdrawOnlyArgs = {
    isDepositMode: true,
    tokenAddress: CommonAddress.Ethereum.USDC,
    token: buildToken(),
    sourceChainId: ChainId.Ethereum,
    destinationChainId: ChainId.RobinhoodChain,
  };
  // Ethereum USDC is also withdraw-only on Plume, which has no LiFi route from Ethereum.
  const PLUME_CHAIN_ID = 98866;

  it('is false on withdrawals, even for a token whose deposit is blocked', () => {
    expect(isTokenDepositUnavailable({ ...withdrawOnlyArgs, isDepositMode: false })).toBe(false);
  });

  it('is false when no ERC-20 is selected', () => {
    expect(
      isTokenDepositUnavailable({ ...withdrawOnlyArgs, tokenAddress: undefined, token: undefined }),
    ).toBe(false);
  });

  it('is false for a token whose canonical deposit is allowed', () => {
    expect(
      isTokenDepositUnavailable({
        ...withdrawOnlyArgs,
        tokenAddress: CommonAddress.Ethereum.USDT,
        destinationChainId: ChainId.ArbitrumOne,
      }),
    ).toBe(false);
  });

  it('is false when the canonical deposit is blocked on a route without a LiFi swap', () => {
    expect(
      isTokenDepositUnavailable({ ...withdrawOnlyArgs, destinationChainId: PLUME_CHAIN_ID }),
    ).toBe(false);
  });

  it('is true when the canonical deposit is blocked and no LiFi pair exists', () => {
    expect(isTokenDepositUnavailable(withdrawOnlyArgs)).toBe(true);
  });

  it('applies to every withdraw-only token on a LiFi route, not only USDC', () => {
    expect(
      isTokenDepositUnavailable({ ...withdrawOnlyArgs, tokenAddress: CommonAddress.Ethereum.USDT }),
    ).toBe(true);
  });

  it('is false when the canonical deposit is blocked but a LiFi pair exists', () => {
    expect(
      isTokenDepositUnavailable({
        ...withdrawOnlyArgs,
        token: buildToken({ listIds: new Set([LIFI_TRANSFER_LIST_ID]) }),
      }),
    ).toBe(false);
  });

  it('treats an unknown token as having no LiFi pair', () => {
    expect(isTokenDepositUnavailable({ ...withdrawOnlyArgs, token: undefined })).toBe(true);
  });
});

describe('selectUsdcToken', () => {
  const storedToken = buildToken({ l2Address: CommonAddress.ArbitrumOne['USDC.e'] });
  const canonicalUsdcToken = buildToken({ l2Address: CommonAddress.ArbitrumOne.USDC });
  const sourceOnlyUsdcToken = buildToken({ lifiOnlyChainId: ChainId.ArbitrumOne });

  it('falls back to the stored token when no USDC metadata resolved', () => {
    expect(selectUsdcToken({ usdcToken: undefined, storedToken })).toBe(storedToken);
  });

  it('returns null when neither is available', () => {
    expect(selectUsdcToken({ usdcToken: null, storedToken: undefined })).toBeNull();
  });

  it('prefers resolved canonical USDC metadata over the stored token', () => {
    expect(selectUsdcToken({ usdcToken: canonicalUsdcToken, storedToken })).toBe(
      canonicalUsdcToken,
    );
  });

  it('keeps the stored token when the resolved USDC is only a source-only fallback', () => {
    expect(selectUsdcToken({ usdcToken: sourceOnlyUsdcToken, storedToken })).toBe(storedToken);
  });

  it('uses the source-only fallback when nothing is stored', () => {
    expect(selectUsdcToken({ usdcToken: sourceOnlyUsdcToken, storedToken: undefined })).toBe(
      sourceOnlyUsdcToken,
    );
  });
});

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

    it('prefers the constant over a listed or imported entry for the same address', () => {
      const listedUsdc = buildToken({ address: CommonAddress.ArbitrumOne.USDC });
      const importedUsdc = buildToken({ address: CommonAddress.ArbitrumOne.USDC });
      expect(
        getTokenForRow({
          ...defaultArgs,
          address: CommonAddress.ArbitrumOne.USDC,
          tokensFromLists: { [listedUsdc.address]: listedUsdc },
          tokensFromUser: { [importedUsdc.address]: importedUsdc },
        }),
      ).toBe(ARB_ONE_NATIVE_USDC_TOKEN);
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

    it('returns null until the route-specific metadata resolves', () => {
      expect(getTokenForRow({ ...orbitArgs, usdcToken: null })).toBeNull();
    });

    it('uses the resolved canonical USDC metadata', () => {
      const usdcToken = buildToken({ l2Address: CommonAddress.ArbitrumOne.USDC });
      expect(getTokenForRow({ ...orbitArgs, usdcToken })).toBe(usdcToken);
    });

    it('ignores a listed entry for the same address while metadata is pending', () => {
      const listedUsdc = buildToken({ address: CommonAddress.ArbitrumOne.USDC });
      expect(
        getTokenForRow({
          ...orbitArgs,
          usdcToken: null,
          tokensFromLists: { [listedUsdc.address]: listedUsdc },
        }),
      ).toBeNull();
    });

    it('prefers the resolved metadata over a listed entry for the same address', () => {
      const listedUsdc = buildToken({ address: CommonAddress.ArbitrumOne.USDC });
      const usdcToken = buildToken({ l2Address: CommonAddress.ArbitrumOne.USDC });
      expect(
        getTokenForRow({
          ...orbitArgs,
          usdcToken,
          tokensFromLists: { [listedUsdc.address]: listedUsdc },
        }),
      ).toBe(usdcToken);
    });

    it('keeps a stored mapping over a source-only USDC fallback', () => {
      const storedUsdc = buildToken({
        address: CommonAddress.ArbitrumOne.USDC,
        l2Address: CommonAddress.ArbitrumOne.USDC,
      });
      const sourceOnlyUsdc = buildToken({ lifiOnlyChainId: ChainId.ArbitrumOne });

      expect(
        getTokenForRow({
          ...orbitArgs,
          tokensFromLists: { [storedUsdc.address]: storedUsdc },
          usdcToken: sourceOnlyUsdc,
        }),
      ).toBe(storedUsdc);
    });
  });
});
