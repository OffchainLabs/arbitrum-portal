import { describe, expect, it, vi } from 'vitest';

import { ERC20BridgeToken } from '../../../hooks/arbTokenBridge.types';
import { ChainId } from '../../../types/ChainId';
import { getEligibleRoutes } from './useRoutesUpdater';

vi.mock('../../../app/api/crosschain-transfers/utils', () => ({
  getTokenOverride: vi.fn(() => ({})),
  isValidLifiTransfer: vi.fn(() => true),
}));

vi.mock('../../../util/featureFlag', () => ({
  isLifiEnabled: vi.fn(() => true),
}));

const baseParams = {
  isOftV2Transfer: false,
  isBatchTransfer: false,
  amount: '1',
  sourceChainId: ChainId.Ethereum,
  destinationChainId: ChainId.ArbitrumOne,
  selectedToken: {} as ERC20BridgeToken,
  tokensFromLists: {},
};

describe('getEligibleRoutes', () => {
  it('keeps canonical and LiFi routes for Ethereum USDC deposits', () => {
    expect(
      getEligibleRoutes({
        ...baseParams,
        isArbitrumCanonicalTransfer: true,
      }),
    ).toEqual(['lifi', 'arbitrum']);
  });

  it('keeps canonical and LiFi routes for USDC.e withdrawals', () => {
    expect(
      getEligibleRoutes({
        ...baseParams,
        sourceChainId: ChainId.ArbitrumOne,
        destinationChainId: ChainId.Ethereum,
        isArbitrumCanonicalTransfer: true,
      }),
    ).toEqual(['lifi', 'arbitrum']);
  });

  it('does not offer the canonical route for Arbitrum native USDC withdrawals', () => {
    expect(
      getEligibleRoutes({
        ...baseParams,
        sourceChainId: ChainId.ArbitrumOne,
        destinationChainId: ChainId.Ethereum,
        isArbitrumCanonicalTransfer: false,
      }),
    ).toEqual(['lifi']);
  });
});
