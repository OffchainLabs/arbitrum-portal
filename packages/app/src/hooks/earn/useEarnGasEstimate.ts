import { BigNumber, utils } from 'ethers';
import { useEffect, useState } from 'react';
import { useConfig, usePublicClient } from 'wagmi';
import { estimateGas } from 'wagmi/actions';

import { useDebouncedValue } from './useDebouncedValue';
import type { TransactionStep } from './useTransactionQuote';

interface UseEarnGasEstimateParams {
  transactionSteps: TransactionStep[] | undefined;
  chainId: number;
  walletAddress: string | undefined;
  apiEstimate?: string; // Optional API-provided estimate (e.g., estimatedGasUsd from transactionQuote)
  enabled?: boolean; // Whether to enable onchain estimation
}

export interface GasEstimate {
  eth: string; // Gas cost in ETH (e.g., "0.001234")
  usd: string | null; // Raw numeric USD value string (e.g., "1.23")
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

/**
 * Hook to estimate gas costs for transaction steps
 * Uses onchain estimation with API fallback for consistent gas cost display
 *
 * @param params - Parameters for gas estimation
 * @returns Gas estimate result with estimate, loading state, and error
 */
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
  const debouncedTransactionSteps = useDebouncedValue(transactionSteps, 300);

  // Estimate gas onchain for more accurate costs
  // Debounce to prevent RPC overload when transactionSteps change frequently
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
        // Filter steps for the target chain
        const chainSteps = debouncedTransactionSteps.filter((step) => step.chainId === chainId);

        if (chainSteps.length === 0) {
          if (!isCancelled) {
            setOnchainGasEstimate(null);
            setIsLoading(false);
          }
          return;
        }

        // Check if there are approval steps before transaction steps
        const approvalStepIndices = new Set(
          chainSteps
            .map((s, idx) => (s.type === 'approval' ? idx : -1))
            .filter((idx) => idx !== -1),
        );

        const gasEstimates = await Promise.all(
          chainSteps.map(async (step, stepIndex) => {
            // For approval steps, always estimate (they don't require prior approval)
            if (step.type === 'approval') {
              try {
                const [gasLimit, gasPrice] = await Promise.all([
                  estimateGas(wagmiConfig, {
                    to: step.to as `0x${string}`,
                    data: step.data as `0x${string}`,
                    value: step.value ? BigInt(step.value) : undefined,
                    account: walletAddress as `0x${string}`,
                    chainId: step.chainId,
                  }),
                  publicClient.getGasPrice(),
                ]);

                const cost = BigNumber.from(gasLimit.toString()).mul(
                  BigNumber.from(gasPrice.toString()),
                );
                return { step, cost };
              } catch {
                return { step, cost: BigNumber.from(0) };
              }
            }

            // For transaction steps in a bundle, estimate assuming approvals are already granted
            const hasApprovalBefore = Array.from(approvalStepIndices).some(
              (approvalIdx) => approvalIdx < stepIndex,
            );

            try {
              const [gasLimit, gasPrice] = await Promise.all([
                estimateGas(wagmiConfig, {
                  to: step.to as `0x${string}`,
                  data: step.data as `0x${string}`,
                  value: step.value ? BigInt(step.value) : undefined,
                  account: walletAddress as `0x${string}`,
                  chainId: step.chainId,
                }),
                publicClient.getGasPrice(),
              ]);

              const cost = BigNumber.from(gasLimit.toString()).mul(
                BigNumber.from(gasPrice.toString()),
              );
              return { step, cost };
            } catch (err) {
              const isAllowanceError = isAllowanceRelatedError(err);

              if (isAllowanceError && hasApprovalBefore) {
                // In a bundle, the approval executes first — return zero to trigger API fallback
                return { step, cost: BigNumber.from(0) };
              }

              if (isAllowanceError && !hasApprovalBefore) {
                return { step, cost: BigNumber.from(0) };
              }

              throw err;
            }
          }),
        );

        // Only sum gas costs for non-approval steps (the actual bundle payload)
        const transactionStepEstimates = gasEstimates.filter(
          ({ step }) => step.type !== 'approval',
        );

        const totalGasCostWei = transactionStepEstimates.reduce(
          (sum, { cost }) => sum.add(cost),
          BigNumber.from(0),
        );

        // If we couldn't estimate gas for any transaction steps (all returned zero due to allowance errors),
        // don't set onchain estimate - fall back to API estimate instead
        const hasValidEstimate = transactionStepEstimates.some(({ cost }) => !cost.isZero());

        if (!hasValidEstimate && transactionStepEstimates.length > 0) {
          if (!isCancelled) {
            setOnchainGasEstimate(null);
            setIsLoading(false);
          }
          return;
        }

        // Convert to ETH and reuse API-provided USD estimate when available.
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
          // Allowance errors are expected when approvals haven't been granted
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

  // Handle API estimate fallback
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

  // Return onchain estimate if available, otherwise fallback to API estimate
  const finalEstimate = onchainGasEstimate || apiGasEstimate || null;

  return {
    estimate: finalEstimate,
    isLoading,
    error,
  };
}
