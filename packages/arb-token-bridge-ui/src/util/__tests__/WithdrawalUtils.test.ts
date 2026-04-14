import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ChainId } from '../../types/ChainId';
import { getAdditionalWithdrawalDelaySeconds, getConfirmationTime } from '../WithdrawalUtils';
import { getBridgeUiConfigForChain } from '../bridgeUiConfig';
import {
  getBlockNumberReferenceChainIdByChainId,
  getConfirmPeriodBlocks,
  getL1BlockTime,
  isNetwork,
} from '../networks';

vi.mock('../bridgeUiConfig', () => ({
  getBridgeUiConfigForChain: vi.fn(),
}));

vi.mock('../networks', () => ({
  getBlockNumberReferenceChainIdByChainId: vi.fn(),
  getConfirmPeriodBlocks: vi.fn(),
  getL1BlockTime: vi.fn(),
  isNetwork: vi.fn(),
}));

vi.mock('../orbitChainsList', () => ({
  orbitChains: {
    1001: {
      parentChainId: ChainId.ArbitrumOne,
      bridgeUiConfig: {
        batchPostingDelaySeconds: 600,
        assertionAfterBatchDelaySeconds: 900,
      },
    },
    1002: {
      parentChainId: ChainId.Ethereum,
      bridgeUiConfig: {
        batchPostingDelaySeconds: 300,
        assertionAfterBatchDelaySeconds: 600,
      },
    },
    1003: {
      parentChainId: ChainId.Ethereum,
      bridgeUiConfig: {
        assertionIntervalSeconds: 1800,
      },
    },
  },
}));

const getBridgeUiConfigForChainMock = vi.mocked(getBridgeUiConfigForChain);
const getBlockNumberReferenceChainIdByChainIdMock = vi.mocked(
  getBlockNumberReferenceChainIdByChainId,
);
const getConfirmPeriodBlocksMock = vi.mocked(getConfirmPeriodBlocks);
const getL1BlockTimeMock = vi.mocked(getL1BlockTime);
const isNetworkMock = vi.mocked(isNetwork);

describe('WithdrawalUtils', () => {
  beforeEach(() => {
    getBridgeUiConfigForChainMock.mockImplementation((chainId) => {
      if (chainId === 2001) {
        return {
          color: '#000000',
          network: { name: 'Fast', logo: '/fast.svg' },
          fastWithdrawalTime: 7_200_000,
        };
      }

      return {
        color: '#000000',
        network: { name: 'Test', logo: '/test.svg' },
      };
    });

    getBlockNumberReferenceChainIdByChainIdMock.mockImplementation(({ chainId }) => {
      if (chainId === 1001) {
        return ChainId.Ethereum;
      }
      if (chainId === 1002 || chainId === 1003 || chainId === ChainId.ArbitrumOne) {
        return ChainId.Ethereum;
      }

      return chainId;
    });

    getConfirmPeriodBlocksMock.mockImplementation((chainId) => {
      if ((chainId as number) === 1001) {
        return 100 as any;
      }

      return 50 as any;
    });

    getL1BlockTimeMock.mockReturnValue(12);

    isNetworkMock.mockImplementation(
      (chainId) =>
        ({
          isArbitrum: chainId === ChainId.ArbitrumOne,
        }) as any,
    );
  });

  it('adds parent-chain extra delay for L3-style withdrawals', () => {
    expect(getAdditionalWithdrawalDelaySeconds(1001)).toBe(600 + 900 + 3600);
  });

  it('uses the new batch-aware delay fields when available', () => {
    expect(getAdditionalWithdrawalDelaySeconds(1002)).toBe(300 + 600);
  });

  it('falls back to legacy assertionIntervalSeconds during migration', () => {
    expect(getAdditionalWithdrawalDelaySeconds(1003)).toBe(1800);
  });

  it('keeps fast withdrawals unchanged', () => {
    const result = getConfirmationTime(2001);

    expect(result.fastWithdrawalActive).toBe(true);
    expect(result.confirmationTimeInSeconds).toBe(7200);
  });

  it('includes recursive extra delay in confirmation time', () => {
    const result = getConfirmationTime(1001);

    expect(result.fastWithdrawalActive).toBe(false);
    expect(result.confirmationTimeInSeconds).toBe(12 * 100 + 600 + 900 + 3600);
  });
});
