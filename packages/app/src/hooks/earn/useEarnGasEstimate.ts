'use client';

import { BigNumber, utils } from 'ethers';
import { useMemo } from 'react';
import useSWR from 'swr';
import { useConfig, usePublicClient } from 'wagmi';
import { estimateGas } from 'wagmi/actions';

import type { TransactionStep } from '@/earn-api/types';

interface UseEarnGasEstimateParams {
  transactionSteps: TransactionStep[] | undefined;
  chainId: number;
  walletAddress: string | undefined;
  apiEstimate?: string;
  enabled?: boolean;
}

export interface GasEstimate {
  eth: string;
  usd: string | null;
}

export interface UseEarnGasEstimateResult {
  estimate: GasEstimate | null;
  isLoading: boolean;
  error: Error | null;
}

function parseApiEstimateUsd(apiEstimate?: string): number | null {
  if (!apiEstimate) {
    return null;
  }

  const parsed = parseFloat(apiEstimate);
  return Number.isFinite(parsed) ? parsed : null;
}

function isAllowanceRelatedError(err: unknown): boolean {
  const errorMessage = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
  return (
    errorMessage.includes('allowance') ||
    errorMessage.includes('transfer amount exceeds allowance') ||
    errorMessage.includes('erc20: transfer amount exceeds allowance')
  );
}

export function useEarnGasEstimate({
  transactionSteps,
  chainId,
  walletAddress,
  apiEstimate,
  enabled = true,
}: UseEarnGasEstimateParams): UseEarnGasEstimateResult {
  const wagmiConfig = useConfig();
  const publicClient = usePublicClient({ chainId });
  const hasSteps = transactionSteps && transactionSteps.length > 0;

  const {
    data: onchainEstimate,
    error: onchainError,
    isLoading: isOnchainLoading,
  } = useSWR(
    enabled && hasSteps && walletAddress && publicClient && chainId !== 0
      ? ([
          transactionSteps,
          walletAddress,
          chainId,
          apiEstimate,
          publicClient,
          'earn-gas-estimate',
        ] as const)
      : null,
    async ([_steps, _walletAddress, _chainId, _apiEstimate, _publicClient]) => {
      const chainSteps = _steps.filter((step) => step.chainId === _chainId);

      if (chainSteps.length === 0) {
        return null;
      }

      const gasPrice = BigNumber.from((await _publicClient.getGasPrice()).toString());

      // Estimate gas for each step; approval/allowance failures are treated as zero-cost
      const perStepCosts = await Promise.all(
        chainSteps.map(async (step) => {
          try {
            const gasLimit = await estimateGas(wagmiConfig, {
              to: step.to as `0x${string}`,
              data: step.data as `0x${string}`,
              value: step.value ? BigInt(step.value) : undefined,
              account: _walletAddress as `0x${string}`,
              chainId: step.chainId,
            });

            return BigNumber.from(gasLimit.toString()).mul(gasPrice);
          } catch (err) {
            if (step.type === 'approval' || isAllowanceRelatedError(err)) {
              return BigNumber.from(0);
            }
            throw err;
          }
        }),
      );

      const hasValidEstimate = perStepCosts.some((cost) => !cost.isZero());
      if (!hasValidEstimate && perStepCosts.length > 0) {
        return null;
      }

      const totalGasCostWei = perStepCosts.reduce((sum, cost) => sum.add(cost), BigNumber.from(0));
      const totalGasCostEth = Number(utils.formatEther(totalGasCostWei));
      const apiEstimateUsd = parseApiEstimateUsd(_apiEstimate);

      return {
        eth: totalGasCostEth.toFixed(6),
        usd: apiEstimateUsd != null ? apiEstimateUsd.toFixed(2) : null,
      } satisfies GasEstimate;
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      errorRetryCount: 2,
      errorRetryInterval: 5_000,
      shouldRetryOnError: (err) => !isAllowanceRelatedError(err),
    },
  );

  // --- API fallback: used only when onchain estimation is unavailable ---
  const apiGasEstimate = useMemo<GasEstimate | null>(() => {
    if (onchainEstimate || isOnchainLoading) {
      return null;
    }
    const cost = parseApiEstimateUsd(apiEstimate);
    if (cost == null) {
      return null;
    }
    return { eth: '—', usd: cost.toFixed(2) };
  }, [apiEstimate, onchainEstimate, isOnchainLoading]);

  return {
    estimate: onchainEstimate ?? apiGasEstimate,
    isLoading: isOnchainLoading,
    error:
      onchainError && !isAllowanceRelatedError(onchainError)
        ? onchainError instanceof Error
          ? onchainError
          : new Error('Failed to estimate gas')
        : null,
  };
}
