// @vitest-environment happy-dom
import { renderHook, waitFor } from '@testing-library/react';
import React, { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { TransactionStep } from '@/earn-api/types';

import { useEarnGasEstimate } from './useEarnGasEstimate';

const mockEstimateGas = vi.fn();
const mockGetGasPrice = vi.fn();

vi.mock('@uidotdev/usehooks', () => ({
  useDebounce: <T,>(value: T) => value,
}));

vi.mock('wagmi', () => ({
  useConfig: () => ({}),
  usePublicClient: () => ({ getGasPrice: mockGetGasPrice }),
}));

vi.mock('wagmi/actions', () => ({
  estimateGas: (...args: unknown[]) => mockEstimateGas(...args),
}));

/**
 * Cache-clearing wrapper so each test starts fresh.
 * Uses a unique key per test to avoid stale data across tests.
 */
let testWrapper: ({ children }: PropsWithChildren) => React.JSX.Element;

beforeEach(async () => {
  // Dynamically import to keep the mock boundary clean
  const { SWRConfig } = await import('swr');
  testWrapper = ({ children }: PropsWithChildren) => (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>{children}</SWRConfig>
  );
});

function makeStep(overrides: Partial<TransactionStep> = {}): TransactionStep {
  return {
    step: 1,
    type: 'transaction',
    to: '0x1111111111111111111111111111111111111111',
    data: '0xabcdef',
    chainId: 42161,
    ...overrides,
  };
}

const defaultParams = {
  chainId: 42161,
  walletAddress: '0x2222222222222222222222222222222222222222',
  enabled: true,
} as const;

afterEach(() => {
  vi.clearAllMocks();
});

describe('useEarnGasEstimate', () => {
  describe('disabled / missing inputs', () => {
    it('returns null estimate when enabled is false', () => {
      const { result } = renderHook(
        () =>
          useEarnGasEstimate({
            ...defaultParams,
            transactionSteps: [makeStep()],
            enabled: false,
          }),
        { wrapper: testWrapper },
      );

      expect(result.current.estimate).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(mockEstimateGas).not.toHaveBeenCalled();
    });

    it('returns null estimate when transactionSteps is undefined', () => {
      const { result } = renderHook(
        () =>
          useEarnGasEstimate({
            ...defaultParams,
            transactionSteps: undefined,
          }),
        { wrapper: testWrapper },
      );

      expect(result.current.estimate).toBeNull();
      expect(mockEstimateGas).not.toHaveBeenCalled();
    });

    it('returns null estimate when transactionSteps is empty', () => {
      const { result } = renderHook(
        () =>
          useEarnGasEstimate({
            ...defaultParams,
            transactionSteps: [],
          }),
        { wrapper: testWrapper },
      );

      expect(result.current.estimate).toBeNull();
      expect(mockEstimateGas).not.toHaveBeenCalled();
    });

    it('returns null estimate when walletAddress is undefined', () => {
      const { result } = renderHook(
        () =>
          useEarnGasEstimate({
            ...defaultParams,
            walletAddress: undefined,
            transactionSteps: [makeStep()],
          }),
        { wrapper: testWrapper },
      );

      expect(result.current.estimate).toBeNull();
      expect(mockEstimateGas).not.toHaveBeenCalled();
    });

    it('returns null estimate when chainId is 0', () => {
      const { result } = renderHook(
        () =>
          useEarnGasEstimate({
            ...defaultParams,
            chainId: 0,
            transactionSteps: [makeStep({ chainId: 0 })],
          }),
        { wrapper: testWrapper },
      );

      expect(result.current.estimate).toBeNull();
      expect(mockEstimateGas).not.toHaveBeenCalled();
    });
  });

  describe('onchain gas estimation', () => {
    it('returns estimated gas cost in ETH for a single step', async () => {
      // gasPrice = 1 gwei, gasLimit = 21000 => cost = 21000 gwei = 0.000021 ETH
      mockGetGasPrice.mockResolvedValue(BigInt(1_000_000_000));
      mockEstimateGas.mockResolvedValue(BigInt(21_000));

      const { result } = renderHook(
        () =>
          useEarnGasEstimate({
            ...defaultParams,
            transactionSteps: [makeStep()],
          }),
        { wrapper: testWrapper },
      );

      await waitFor(() => {
        expect(result.current.estimate).not.toBeNull();
      });

      expect(result.current.estimate?.eth).toBe('0.000021');
      expect(result.current.estimate?.usd).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('sums gas costs across multiple transaction steps', async () => {
      // gasPrice = 1 gwei, two steps with gasLimit 21000 each => 0.000042 ETH
      mockGetGasPrice.mockResolvedValue(BigInt(1_000_000_000));
      mockEstimateGas.mockResolvedValue(BigInt(21_000));

      const { result } = renderHook(
        () =>
          useEarnGasEstimate({
            ...defaultParams,
            transactionSteps: [
              makeStep({ step: 1 }),
              makeStep({ step: 2, to: '0x3333333333333333333333333333333333333333' }),
            ],
          }),
        { wrapper: testWrapper },
      );

      await waitFor(() => {
        expect(result.current.estimate).not.toBeNull();
      });

      expect(result.current.estimate?.eth).toBe('0.000042');
    });

    it('filters steps to only matching chainId', async () => {
      mockGetGasPrice.mockResolvedValue(BigInt(1_000_000_000));
      mockEstimateGas.mockResolvedValue(BigInt(21_000));

      const { result } = renderHook(
        () =>
          useEarnGasEstimate({
            ...defaultParams,
            chainId: 42161,
            transactionSteps: [
              makeStep({ chainId: 42161 }),
              makeStep({ chainId: 1 }), // different chain, should be excluded
            ],
          }),
        { wrapper: testWrapper },
      );

      await waitFor(() => {
        expect(result.current.estimate).not.toBeNull();
      });

      expect(mockEstimateGas).toHaveBeenCalledTimes(1);
      expect(result.current.estimate?.eth).toBe('0.000021');
    });

    it('includes USD estimate from apiEstimate when provided', async () => {
      mockGetGasPrice.mockResolvedValue(BigInt(1_000_000_000));
      mockEstimateGas.mockResolvedValue(BigInt(21_000));

      const { result } = renderHook(
        () =>
          useEarnGasEstimate({
            ...defaultParams,
            transactionSteps: [makeStep()],
            apiEstimate: '1.5',
          }),
        { wrapper: testWrapper },
      );

      await waitFor(() => {
        expect(result.current.estimate).not.toBeNull();
      });

      expect(result.current.estimate?.eth).toBe('0.000021');
      expect(result.current.estimate?.usd).toBe('1.50');
    });
  });

  describe('allowance error handling', () => {
    it('treats approval step failures as zero cost', async () => {
      mockGetGasPrice.mockResolvedValue(BigInt(1_000_000_000));
      mockEstimateGas
        .mockRejectedValueOnce(new Error('ERC20: transfer amount exceeds allowance'))
        .mockResolvedValueOnce(BigInt(50_000));

      const { result } = renderHook(
        () =>
          useEarnGasEstimate({
            ...defaultParams,
            transactionSteps: [
              makeStep({ step: 1, type: 'approval' }),
              makeStep({ step: 2, type: 'transaction' }),
            ],
          }),
        { wrapper: testWrapper },
      );

      await waitFor(() => {
        expect(result.current.estimate).not.toBeNull();
      });

      // Only the transaction step cost: 50000 * 1 gwei = 0.000050 ETH
      expect(result.current.estimate?.eth).toBe('0.000050');
      expect(result.current.error).toBeNull();
    });

    it('treats allowance-related errors on transaction steps as zero cost', async () => {
      mockGetGasPrice.mockResolvedValue(BigInt(1_000_000_000));
      mockEstimateGas
        .mockRejectedValueOnce(new Error('transfer amount exceeds allowance'))
        .mockResolvedValueOnce(BigInt(50_000));

      const { result } = renderHook(
        () =>
          useEarnGasEstimate({
            ...defaultParams,
            transactionSteps: [
              makeStep({ step: 1, type: 'transaction' }),
              makeStep({ step: 2, type: 'transaction' }),
            ],
          }),
        { wrapper: testWrapper },
      );

      await waitFor(() => {
        expect(result.current.estimate).not.toBeNull();
      });

      expect(result.current.estimate?.eth).toBe('0.000050');
      expect(result.current.error).toBeNull();
    });

    it('returns null estimate when all steps estimate to zero (all approvals fail)', async () => {
      mockGetGasPrice.mockResolvedValue(BigInt(1_000_000_000));
      mockEstimateGas.mockRejectedValue(new Error('ERC20: transfer amount exceeds allowance'));

      const { result } = renderHook(
        () =>
          useEarnGasEstimate({
            ...defaultParams,
            transactionSteps: [
              makeStep({ step: 1, type: 'approval' }),
              makeStep({ step: 2, type: 'approval' }),
            ],
          }),
        { wrapper: testWrapper },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.estimate).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('suppresses top-level allowance errors', async () => {
      mockGetGasPrice.mockResolvedValue(BigInt(1_000_000_000));
      mockEstimateGas.mockRejectedValue(new Error('allowance exceeded'));

      const { result } = renderHook(
        () =>
          useEarnGasEstimate({
            ...defaultParams,
            transactionSteps: [makeStep({ type: 'transaction' })],
          }),
        { wrapper: testWrapper },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('non-allowance errors', () => {
    it('surfaces non-allowance errors', async () => {
      mockGetGasPrice.mockResolvedValue(BigInt(1_000_000_000));
      mockEstimateGas.mockRejectedValue(new Error('execution reverted'));

      const { result } = renderHook(
        () =>
          useEarnGasEstimate({
            ...defaultParams,
            transactionSteps: [makeStep()],
          }),
        { wrapper: testWrapper },
      );

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      expect(result.current.error?.message).toBe('execution reverted');
      expect(result.current.estimate).toBeNull();
    });
  });

  describe('API fallback', () => {
    it('uses API estimate as fallback when onchain estimation is disabled', () => {
      const { result } = renderHook(
        () =>
          useEarnGasEstimate({
            ...defaultParams,
            transactionSteps: undefined,
            apiEstimate: '2.50',
          }),
        { wrapper: testWrapper },
      );

      // No onchain estimate possible (no steps), so API fallback kicks in
      expect(result.current.estimate).toEqual({ eth: '—', usd: '2.50' });
      expect(result.current.isLoading).toBe(false);
    });

    it('returns null for invalid apiEstimate strings', () => {
      const { result } = renderHook(
        () =>
          useEarnGasEstimate({
            ...defaultParams,
            transactionSteps: undefined,
            apiEstimate: 'not-a-number',
          }),
        { wrapper: testWrapper },
      );

      expect(result.current.estimate).toBeNull();
    });

    it('prefers onchain estimate over API fallback', async () => {
      mockGetGasPrice.mockResolvedValue(BigInt(1_000_000_000));
      mockEstimateGas.mockResolvedValue(BigInt(21_000));

      const { result } = renderHook(
        () =>
          useEarnGasEstimate({
            ...defaultParams,
            transactionSteps: [makeStep()],
            apiEstimate: '5.00',
          }),
        { wrapper: testWrapper },
      );

      await waitFor(() => {
        expect(result.current.estimate).not.toBeNull();
      });

      // Onchain estimate is used, with USD from apiEstimate
      expect(result.current.estimate?.eth).toBe('0.000021');
      expect(result.current.estimate?.usd).toBe('5.00');
    });
  });
});
