import { describe, expect, it, vi } from 'vitest';

import type { LifiCrosschainTransfersRoute } from '../../../app/api/crosschain-transfers/lifi';
import { ERC20BridgeToken, TokenType } from '../../../hooks/arbTokenBridge.types';
import { ChainId } from '../../../types/ChainId';
import { CommonAddress } from '../../../util/CommonAddressUtils';
import {
  GetEligibleRoutesParams,
  getEligibleRoutes,
  getSelectedRouteForAvailableRoutes,
  hasLowLifiLiquidity,
} from './useRoutesUpdater';

vi.mock('../../../app/api/crosschain-transfers/utils', () => ({
  getTokenOverride: vi.fn(() => ({})),
  isValidLifiTransfer: vi.fn(() => true),
}));

vi.mock('../../../util/featureFlag', () => ({
  isCctpEnabled: vi.fn(() => true),
  isLifiEnabled: vi.fn(() => true),
}));

vi.mock('../../../util/networks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../util/networks')>();

  return {
    ...actual,
    isNetwork: vi.fn((chainId) =>
      chainId === 4663
        ? { ...actual.isNetwork(chainId), isTestnet: false }
        : actual.isNetwork(chainId),
    ),
  };
});

const baseToken: ERC20BridgeToken = {
  address: '0x0000000000000000000000000000000000000001',
  decimals: 18,
  listIds: new Set(),
  name: 'Token',
  symbol: 'TOKEN',
  type: TokenType.ERC20,
};

const baseParams: GetEligibleRoutesParams = {
  isOftV2Transfer: false,
  isNativeUsdcTransfer: true,
  isCctpEnabled: true,
  isBatchTransfer: false,
  amount: '1',
  isDepositMode: true,
  sourceChainId: ChainId.Ethereum,
  destinationChainId: ChainId.ArbitrumOne,
  selectedToken: baseToken,
  destinationToken: null,
  isArbitrumCanonicalTransfer: true,
  tokensFromLists: {},
};

describe('getEligibleRoutes', () => {
  it('offers CCTP and existing alternatives when CCTP is enabled', () => {
    expect(getEligibleRoutes(baseParams)).toEqual(['cctp', 'lifi', 'arbitrum']);
  });

  it('offers only LiFi when either selected token is LiFi-only', () => {
    expect(
      getEligibleRoutes({
        ...baseParams,
        selectedToken: {
          ...baseToken,
          lifiOnlyChainId: ChainId.Ethereum,
        },
      }),
    ).toEqual(['lifi']);
  });

  it('removes CCTP while preserving alternatives when CCTP is disabled', () => {
    expect(
      getEligibleRoutes({
        ...baseParams,
        isCctpEnabled: false,
      }),
    ).toEqual(['lifi', 'arbitrum']);
  });

  it('preserves LiFi for a native USDC withdrawal when CCTP is disabled', () => {
    expect(
      getEligibleRoutes({
        ...baseParams,
        isCctpEnabled: false,
        isDepositMode: false,
        sourceChainId: ChainId.ArbitrumOne,
        destinationChainId: ChainId.Ethereum,
        isArbitrumCanonicalTransfer: false,
      }),
    ).toEqual(['lifi']);
  });

  it('offers no route when CCTP is disabled and no alternative is eligible', () => {
    expect(
      getEligibleRoutes({
        ...baseParams,
        isCctpEnabled: false,
        isDepositMode: false,
        sourceChainId: ChainId.ArbitrumSepolia,
        destinationChainId: ChainId.Sepolia,
        isArbitrumCanonicalTransfer: false,
      }),
    ).toEqual([]);
  });

  it('offers only the canonical route for canonical VIRTUAL withdrawals', () => {
    expect(
      getEligibleRoutes({
        ...baseParams,
        isNativeUsdcTransfer: false,
        isDepositMode: false,
        sourceChainId: ChainId.RobinhoodChain,
        destinationChainId: ChainId.Ethereum,
        selectedToken: {
          ...baseToken,
          address: CommonAddress.Ethereum.VIRTUAL,
          l2Address: CommonAddress.RobinhoodChain.VIRTUAL_CANONICAL,
        },
      }),
    ).toEqual(['arbitrum']);
  });

  it('offers only LiFi for VIRTUAL deposits to Robinhood Chain', () => {
    expect(
      getEligibleRoutes({
        ...baseParams,
        isNativeUsdcTransfer: false,
        destinationChainId: ChainId.RobinhoodChain,
        selectedToken: {
          ...baseToken,
          address: CommonAddress.Ethereum.VIRTUAL,
          l2Address: CommonAddress.RobinhoodChain.VIRTUAL_CANONICAL,
        },
        isArbitrumCanonicalTransfer: false,
      }),
    ).toEqual(['lifi']);
  });

  it('offers only LiFi for regular VIRTUAL withdrawals', () => {
    expect(
      getEligibleRoutes({
        ...baseParams,
        isNativeUsdcTransfer: false,
        isDepositMode: false,
        sourceChainId: ChainId.RobinhoodChain,
        destinationChainId: ChainId.Ethereum,
        selectedToken: {
          ...baseToken,
          address: CommonAddress.RobinhoodChain.VIRTUAL,
          lifiOnlyChainId: ChainId.RobinhoodChain,
        },
        isArbitrumCanonicalTransfer: false,
      }),
    ).toEqual(['lifi']);
  });
});

describe('getSelectedRouteForAvailableRoutes', () => {
  it('replaces a stale CCTP selection with an available route', () => {
    expect(
      getSelectedRouteForAvailableRoutes('cctp', [
        {
          type: 'arbitrum',
          amountReceived: '1',
        },
      ]),
    ).toBe('arbitrum');
  });

  it('clears a stale CCTP selection when no route remains', () => {
    expect(getSelectedRouteForAvailableRoutes('cctp', [])).toBeUndefined();
  });
});

describe('hasLowLifiLiquidity', () => {
  const params = {
    eligibleRouteTypes: ['lifi'] as const,
    isLoading: false,
    error: undefined,
  };

  it('returns false when LiFi returned a route', () => {
    expect(
      hasLowLifiLiquidity({
        ...params,
        eligibleRouteTypes: [...params.eligibleRouteTypes],
        routes: [{} as LifiCrosschainTransfersRoute],
      }),
    ).toBe(false);
  });

  it('returns true only after LiFi returned an empty route list', () => {
    expect(
      hasLowLifiLiquidity({
        ...params,
        eligibleRouteTypes: [...params.eligibleRouteTypes],
        routes: [],
      }),
    ).toBe(true);
    expect(
      hasLowLifiLiquidity({
        ...params,
        eligibleRouteTypes: [...params.eligibleRouteTypes],
        routes: undefined,
      }),
    ).toBe(false);
  });
});
