'use client';

import { useDebounce } from '@uidotdev/usehooks';
import { BigNumber, utils } from 'ethers';
import { useEffect, useState } from 'react';
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
  const [onchainGasEstimate, setOnchainGasEstimate] = useState<GasEstimate | null>(null);
  const [apiGasEstimate, setApiGasEstimate] = useState<GasEstimate | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const debouncedTransactionSteps = useDebounce(transactionSteps, 300);

  useEffect(() => {
    if (
      !enabled ||
      !debouncedTransactionSteps ||
      debouncedTransactionSteps.length === 0 ||
      !walletAddress ||
      !publicClient ||
      chainId === 0
    ) {
      setOnchainGasEstimate(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    let isCancelled = false;
    const estimateGasCosts = async () => {
      try {
        const chainSteps = debouncedTransactionSteps.filter((step) => step.chainId === chainId);

        if (chainSteps.length === 0) {
          if (!isCancelled) {
            setOnchainGasEstimate(null);
            setIsLoading(false);
          }
          return;
        }

        const gasPrice = BigNumber.from((await publicClient.getGasPrice()).toString());

        const gasEstimates = await Promise.all(
          chainSteps.map(async (step) => {
            try {
              const gasLimit = await estimateGas(wagmiConfig, {
                to: step.to as `0x${string}`,
                data: step.data as `0x${string}`,
                value: step.value ? BigInt(step.value) : undefined,
                account: walletAddress as `0x${string}`,
                chainId: step.chainId,
              });

              const cost = BigNumber.from(gasLimit.toString()).mul(gasPrice);
              return { step, cost };
            } catch (err) {
              const isAllowanceError = isAllowanceRelatedError(err);
              if (step.type === 'approval' || isAllowanceError) {
                return { step, cost: BigNumber.from(0) };
              }

              throw err;
            }
          }),
        );

        const totalGasCostWei = gasEstimates.reduce(
          (sum, { cost }) => sum.add(cost),
          BigNumber.from(0),
        );

        const hasValidEstimate = gasEstimates.some(({ cost }) => !cost.isZero());

        if (!hasValidEstimate && gasEstimates.length > 0) {
          if (!isCancelled) {
            setOnchainGasEstimate(null);
            setIsLoading(false);
          }
          return;
        }

        const totalGasCostEth = Number(utils.formatEther(totalGasCostWei));
        const apiEstimateUsd = parseApiEstimateUsd(apiEstimate);
        const usd = apiEstimateUsd != null ? apiEstimateUsd.toFixed(2) : null;

        if (!isCancelled) {
          setOnchainGasEstimate({
            eth: totalGasCostEth.toFixed(6),
            usd,
          });
          setIsLoading(false);
        }
      } catch (err) {
        const isAllowanceError = isAllowanceRelatedError(err);

        if (isAllowanceError) {
          if (!isCancelled) {
            setOnchainGasEstimate(null);
            setIsLoading(false);
          }
          return;
        }

        if (!isCancelled) {
          setOnchainGasEstimate(null);
          setError(err instanceof Error ? err : new Error('Failed to estimate gas'));
          setIsLoading(false);
        }
      }
    };

    estimateGasCosts();

    return () => {
      isCancelled = true;
    };
  }, [
    debouncedTransactionSteps,
    walletAddress,
    publicClient,
    chainId,
    wagmiConfig,
    enabled,
    apiEstimate,
  ]);

  useEffect(() => {
    if (!apiEstimate || onchainGasEstimate) {
      setApiGasEstimate(null);
      if (!onchainGasEstimate) {
        setIsLoading(false);
      }
      return;
    }

    setIsLoading(true);
    setError(null);

    const processApiEstimate = async () => {
      const cost = parseApiEstimateUsd(apiEstimate);
      if (cost == null) {
        setApiGasEstimate(null);
        setIsLoading(false);
        return;
      }

      setApiGasEstimate({
        eth: '—',
        usd: cost.toFixed(2),
      });
      setIsLoading(false);
    };

    processApiEstimate();
  }, [apiEstimate, onchainGasEstimate]);

  const finalEstimate = onchainGasEstimate || apiGasEstimate || null;

  return {
    estimate: finalEstimate,
    isLoading,
    error,
  };
}
