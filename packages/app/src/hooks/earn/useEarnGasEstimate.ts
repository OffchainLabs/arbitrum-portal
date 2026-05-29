'use client';

import { BigNumber, utils } from 'ethers';
import { useMemo } from 'react';
import useSWR from 'swr';
import { useConfig, usePublicClient } from 'wagmi';
import { estimateGas } from 'wagmi/actions';

import { useETHPrice } from '@/bridge/hooks/useETHPrice';
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

// Generic fallback gas limits used when on-chain simulation throws AND the
// adapter didn't attach a vendor-specific `gasLimitFallback` to the step.
// Adapters set their own values based on observed history; this is a safety
// net only. Surfacing a rough estimate is better than showing "-" — real
// submit-time errors still bubble up to the user from the transaction
// execution path.
const FALLBACK_GAS_LIMITS: Record<'approval' | 'transaction', number> = {
  approval: 80_000,
  transaction: 1_000_000,
};

function getFallbackGasLimit(step: TransactionStep): BigNumber {
  return BigNumber.from(step.gasLimitFallback ?? FALLBACK_GAS_LIMITS[step.type]);
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
  const { ethToUSD } = useETHPrice();
  const hasSteps = transactionSteps && transactionSteps.length > 0;

  const {
    data: onchainEstimateEth,
    error: onchainError,
    isLoading: isOnchainLoading,
  } = useSWR(
    enabled && hasSteps && walletAddress && publicClient && chainId !== 0
      ? ([transactionSteps, walletAddress, chainId, publicClient, 'earn-gas-estimate'] as const)
      : null,
    async ([_steps, _walletAddress, _chainId, _publicClient]) => {
      const chainSteps = _steps.filter((step) => step.chainId === _chainId);

      if (chainSteps.length === 0) {
        return null;
      }

      const gasPrice = BigNumber.from((await _publicClient.getGasPrice()).toString());

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
            if (isAllowanceRelatedError(err)) {
              return BigNumber.from(0);
            }
            return getFallbackGasLimit(step).mul(gasPrice);
          }
        }),
      );

      const totalGasCostWei = perStepCosts.reduce((sum, cost) => sum.add(cost), BigNumber.from(0));
      if (totalGasCostWei.isZero()) {
        return null;
      }
      return Number(utils.formatEther(totalGasCostWei));
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      errorRetryCount: 2,
      errorRetryInterval: 5_000,
      shouldRetryOnError: (err) => !isAllowanceRelatedError(err),
    },
  );

  const onchainEstimate = useMemo<GasEstimate | null>(() => {
    if (typeof onchainEstimateEth !== 'number') {
      return null;
    }
    const usdValue = ethToUSD(onchainEstimateEth);
    return {
      eth: onchainEstimateEth.toFixed(6),
      usd: usdValue > 0 ? usdValue.toFixed(6) : null,
    };
  }, [onchainEstimateEth, ethToUSD]);

  // --- API fallback: used only when onchain estimation is unavailable ---
  const apiGasEstimate = useMemo<GasEstimate | null>(() => {
    if (onchainEstimate || isOnchainLoading) {
      return null;
    }
    const cost = parseApiEstimateUsd(apiEstimate);
    if (cost == null || cost <= 0) {
      return null;
    }
    return { eth: '—', usd: cost.toFixed(6) };
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
