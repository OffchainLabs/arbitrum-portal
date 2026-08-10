import { describe, expect, it, vi } from 'vitest';

import { ERC20BridgeToken } from '../../../hooks/arbTokenBridge.types';
import { ChainId } from '../../../types/ChainId';
import {
  GetEligibleRoutesParams,
  getEligibleRoutes,
  getSelectedRouteForAvailableRoutes,
} from './useRoutesUpdater';

vi.mock('../../../app/api/crosschain-transfers/utils', () => ({
  getTokenOverride: vi.fn(() => ({})),
  isValidLifiTransfer: vi.fn(() => true),
}));

vi.mock('../../../util/featureFlag', () => ({
  isCctpEnabled: vi.fn(() => true),
  isLifiEnabled: vi.fn(() => true),
}));

const baseParams: GetEligibleRoutesParams = {
  isOftV2Transfer: false,
  isNativeUsdcTransfer: true,
  isCctpEnabled: true,
  isBatchTransfer: false,
  amount: '1',
  isDepositMode: true,
  sourceChainId: ChainId.Ethereum,
  destinationChainId: ChainId.ArbitrumOne,
  selectedToken: {} as ERC20BridgeToken,
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
          ...(baseParams.selectedToken as ERC20BridgeToken),
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
});

describe('getSelectedRouteForAvailableRoutes', () => {
  it('replaces a stale CCTP selection with an available route', () => {
    expect(
      getSelectedRouteForAvailableRoutes('cctp', [
        {
          type: 'arbitrum',
          data: { amountReceived: '1' },
        },
      ]),
    ).toBe('arbitrum');
  });

  it('clears a stale CCTP selection when no route remains', () => {
    expect(getSelectedRouteForAvailableRoutes('cctp', [])).toBeUndefined();
  });
});
