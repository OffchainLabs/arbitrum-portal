import { BigNumber, utils } from 'ethers';
import { useEffect, useRef, useState } from 'react';
import { useConfig, usePublicClient } from 'wagmi';
import { estimateGas } from 'wagmi/actions';

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
  usd: string; // Gas cost in USD (e.g., "$1.23 USD")
}

export interface UseEarnGasEstimateResult {
  estimate: GasEstimate | null;
  isLoading: boolean;
  error: Error | null;
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
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Estimate gas onchain for more accurate costs
  // Debounce to prevent RPC overload when transactionSteps change frequently
  useEffect(() => {
    console.log('[useEarnGasEstimate] Effect triggered', {
      enabled,
      transactionStepsLength: transactionSteps?.length,
      walletAddress,
      hasPublicClient: !!publicClient,
      chainId,
    });

    // Clear any pending debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    if (
      !enabled ||
      !transactionSteps ||
      transactionSteps.length === 0 ||
      !walletAddress ||
      !publicClient ||
      chainId === 0
    ) {
      console.log('[useEarnGasEstimate] Skipping estimation - conditions not met');
      setOnchainGasEstimate(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    // Debounce gas estimation by 300ms to prevent RPC overload
    // This works in conjunction with useTransactionQuote's 500ms debounce
    console.log('[useEarnGasEstimate] Debouncing gas estimation (300ms)...');
    setIsLoading(true);
    setError(null);

    debounceTimerRef.current = setTimeout(() => {
      console.log('[useEarnGasEstimate] Starting gas estimation after debounce...');

      const estimateGasCosts = async () => {
        try {
          // Filter steps for the target chain
          // We estimate gas for ALL steps (including approvals) to ensure estimation doesn't fail
          // But we only sum costs for non-approval steps in the final estimate
          const chainSteps = transactionSteps.filter((step) => step.chainId === chainId);
          console.log('[useEarnGasEstimate] Chain steps:', {
            totalSteps: transactionSteps.length,
            chainSteps: chainSteps.length,
            stepTypes: chainSteps.map((s) => ({ type: s.type, step: s.step })),
          });

          if (chainSteps.length === 0) {
            console.log('[useEarnGasEstimate] No chain steps found');
            setOnchainGasEstimate(null);
            setIsLoading(false);
            return;
          }

          // Estimate gas for all steps (including approvals) to prevent estimation failures
          // For bundled transactions (sendCalls), approvals execute first, so transaction steps
          // should be estimated assuming approvals are already granted
          console.log('[useEarnGasEstimate] Estimating gas for all steps...');

          // Check if there are approval steps before transaction steps
          // This helps us know if we should estimate transaction steps assuming approvals exist
          const hasApprovalSteps = chainSteps.some((s) => s.type === 'approval');
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
                  console.log(`[useEarnGasEstimate] Estimating approval step ${step.step}...`);
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
                  console.log(`[useEarnGasEstimate] Approval step ${step.step} cost:`, {
                    gasLimit: gasLimit.toString(),
                    gasPrice: gasPrice.toString(),
                    costWei: cost.toString(),
                    costEth: utils.formatEther(cost),
                  });
                  return { step, cost };
                } catch (err) {
                  console.warn(
                    `[useEarnGasEstimate] Approval step ${step.step} estimation failed:`,
                    err,
                  );
                  // If approval estimation fails, skip it (shouldn't happen, but handle gracefully)
                  return { step, cost: BigNumber.from(0) };
                }
              }

              // For transaction steps in a bundle, estimate assuming approvals are already granted
              // This matches how MetaMask estimates gas for sendCalls bundles
              const hasApprovalBefore = Array.from(approvalStepIndices).some(
                (approvalIdx) => approvalIdx < stepIndex,
              );

              try {
                console.log(`[useEarnGasEstimate] Estimating transaction step ${step.step}...`, {
                  hasApprovalBefore,
                  hasApprovalSteps,
                });

                const [gasLimit, gasPrice] = await Promise.all([
                  estimateGas(wagmiConfig, {
                    to: step.to as `0x${string}`,
                    data: step.data as `0x${string}`,
                    value: step.value ? BigInt(step.value) : undefined,
                    account: walletAddress as `0x${string}`,
                    chainId: step.chainId,
                    // Note: We can't directly simulate state overrides with estimateGas,
                    // but if there's an approval step before this, we assume it will succeed
                    // in the bundle execution, so we estimate optimistically
                  }),
                  publicClient.getGasPrice(),
                ]);

                const cost = BigNumber.from(gasLimit.toString()).mul(
                  BigNumber.from(gasPrice.toString()),
                );
                console.log(`[useEarnGasEstimate] Transaction step ${step.step} cost:`, {
                  gasLimit: gasLimit.toString(),
                  gasPrice: gasPrice.toString(),
                  costWei: cost.toString(),
                  costEth: utils.formatEther(cost),
                });
                return { step, cost };
              } catch (err) {
                // Check if this is an allowance error
                const errorMessage =
                  err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
                const isAllowanceError =
                  errorMessage.includes('allowance') ||
                  errorMessage.includes('transfer amount exceeds allowance') ||
                  errorMessage.includes('erc20: transfer amount exceeds allowance');

                console.log(`[useEarnGasEstimate] Transaction step ${step.step} error:`, {
                  errorMessage,
                  isAllowanceError,
                  hasApprovalBefore,
                  hasApprovalSteps,
                  error: err instanceof Error ? err.message : String(err),
                });

                if (isAllowanceError && hasApprovalBefore) {
                  // In a bundle, the approval executes first, so this transaction step
                  // should succeed. However, we can't estimate it without the approval.
                  // MetaMask handles this by estimating the bundle as a whole.
                  // For now, we'll use a fallback: estimate with a simulated high allowance
                  // or fall back to API estimate
                  console.log(
                    `[useEarnGasEstimate] Transaction step ${step.step} - allowance error but approval exists in bundle. ` +
                      `In sendCalls bundle, approval executes first, so this should succeed. ` +
                      `Falling back to API estimate for accurate gas cost.`,
                  );
                  // Return zero to trigger API fallback - the API estimate should account for the bundle
                  return { step, cost: BigNumber.from(0) };
                }

                if (isAllowanceError && !hasApprovalBefore) {
                  // No approval step before this transaction - this is a real error
                  console.log(
                    `[useEarnGasEstimate] Transaction step ${step.step} - allowance error with no approval step. ` +
                      `This transaction will fail without approval.`,
                  );
                  return { step, cost: BigNumber.from(0) };
                }

                // For other errors, rethrow to be caught by outer try-catch
                throw err;
              }
            }),
          );

          // Only sum gas costs for non-approval steps (the actual bundle payload)
          const transactionStepEstimates = gasEstimates.filter(
            ({ step }) => step.type !== 'approval',
          );
          console.log('[useEarnGasEstimate] Transaction step estimates:', {
            totalEstimates: gasEstimates.length,
            transactionStepEstimates: transactionStepEstimates.length,
            costs: transactionStepEstimates.map(({ step, cost }) => ({
              step: step.step,
              costWei: cost.toString(),
              costEth: utils.formatEther(cost),
              isZero: cost.isZero(),
            })),
          });

          const totalGasCostWei = transactionStepEstimates.reduce(
            (sum, { cost }) => sum.add(cost),
            BigNumber.from(0),
          );
          console.log('[useEarnGasEstimate] Total gas cost:', {
            totalGasCostWei: totalGasCostWei.toString(),
            totalGasCostEth: utils.formatEther(totalGasCostWei),
          });

          // If we couldn't estimate gas for any transaction steps (all returned zero due to allowance errors),
          // don't set onchain estimate - fall back to API estimate instead
          const hasValidEstimate = transactionStepEstimates.some(({ cost }) => !cost.isZero());
          console.log('[useEarnGasEstimate] Has valid estimate:', {
            hasValidEstimate,
            transactionStepEstimatesLength: transactionStepEstimates.length,
          });

          if (!hasValidEstimate && transactionStepEstimates.length > 0) {
            // All transaction step estimations failed (likely due to missing approvals)
            // Don't set error - just skip onchain estimate and let API fallback handle it
            console.log('[useEarnGasEstimate] No valid estimate - falling back to API estimate');
            setOnchainGasEstimate(null);
            setIsLoading(false);
            return;
          }

          // Convert to ETH and USD
          const totalGasCostEth = Number(utils.formatEther(totalGasCostWei));
          console.log('[useEarnGasEstimate] Fetching ETH price for USD conversion...');
          const ethPriceResponse = await fetch(
            'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd',
          );
          const ethPriceData = await ethPriceResponse.json();
          const ethPrice = ethPriceData.ethereum?.usd || 3000;
          const totalGasCostUsd = totalGasCostEth * ethPrice;

          const finalEstimate = {
            eth: totalGasCostEth.toFixed(6),
            usd: `$${totalGasCostUsd.toFixed(2)} USD`,
          };
          console.log('[useEarnGasEstimate] Setting onchain estimate:', finalEstimate);
          setOnchainGasEstimate(finalEstimate);
          setIsLoading(false);
        } catch (err) {
          // Check if this is an allowance error - if so, don't treat it as an error
          // Just skip onchain estimation and let API fallback handle it
          const errorMessage =
            err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
          const isAllowanceError =
            errorMessage.includes('allowance') ||
            errorMessage.includes('transfer amount exceeds allowance') ||
            errorMessage.includes('erc20: transfer amount exceeds allowance');

          console.log('[useEarnGasEstimate] Outer catch block:', {
            errorMessage,
            isAllowanceError,
            error: err instanceof Error ? err.message : String(err),
          });

          if (isAllowanceError) {
            // Allowance errors are expected when approvals haven't been granted
            // Don't set error - just skip onchain estimate and let API fallback handle it
            console.log(
              '[useEarnGasEstimate] Allowance error - skipping onchain estimate, using API fallback',
            );
            setOnchainGasEstimate(null);
            setIsLoading(false);
            return;
          }

          // For other errors, log and set error state
          console.error('[useEarnGasEstimate] Failed to estimate gas onchain:', err);
          setOnchainGasEstimate(null);
          setError(err instanceof Error ? err : new Error('Failed to estimate gas'));
          setIsLoading(false);
        }
      };

      estimateGasCosts();
    }, 300); // 300ms debounce delay

    // Cleanup function to clear debounce timer
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [transactionSteps, walletAddress, publicClient, chainId, wagmiConfig, enabled]);

  // Handle API estimate fallback
  useEffect(() => {
    console.log('[useEarnGasEstimate] API estimate effect:', {
      apiEstimate,
      hasOnchainEstimate: !!onchainGasEstimate,
    });

    if (!apiEstimate || onchainGasEstimate) {
      // Don't process API estimate if we have onchain estimate
      console.log('[useEarnGasEstimate] Skipping API estimate processing');
      setApiGasEstimate(null);
      if (!onchainGasEstimate) {
        setIsLoading(false);
      }
      return;
    }

    console.log('[useEarnGasEstimate] Processing API estimate...');
    setIsLoading(true);
    setError(null);

    const processApiEstimate = async () => {
      const cost = parseFloat(apiEstimate.replace('$', '').replace(' USD', ''));
      console.log('[useEarnGasEstimate] Parsed API estimate cost:', {
        apiEstimate,
        cost,
        isNaN: isNaN(cost),
      });
      if (isNaN(cost)) {
        console.log('[useEarnGasEstimate] Invalid API estimate cost');
        setApiGasEstimate(null);
        setIsLoading(false);
        return;
      }

      try {
        // For API estimates, we only have USD, so estimate ETH using current price
        const ethPriceResponse = await fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd',
        );
        const ethPriceData = await ethPriceResponse.json();
        const ethPrice = ethPriceData.ethereum?.usd || 3000;
        const estimatedEth = cost / ethPrice;

        const apiEstimateResult = {
          eth: estimatedEth.toFixed(6),
          usd: `$${cost.toFixed(2)} USD`,
        };
        console.log('[useEarnGasEstimate] Setting API estimate:', apiEstimateResult);
        setApiGasEstimate(apiEstimateResult);
        setIsLoading(false);
      } catch (err) {
        console.error('[useEarnGasEstimate] Failed to fetch ETH price for API estimate:', err);
        // Fallback: use default ETH price
        const defaultEthPrice = 3000;
        const estimatedEth = cost / defaultEthPrice;
        const apiEstimateResult = {
          eth: estimatedEth.toFixed(6),
          usd: `$${cost.toFixed(2)} USD`,
        };
        console.log(
          '[useEarnGasEstimate] Setting API estimate with default ETH price:',
          apiEstimateResult,
        );
        setApiGasEstimate(apiEstimateResult);
        setIsLoading(false);
        // Don't set error for API fallback since we have a default
      }
    };

    processApiEstimate();
  }, [apiEstimate, onchainGasEstimate]);

  // Return onchain estimate if available, otherwise fallback to API estimate
  const finalEstimate = onchainGasEstimate || apiGasEstimate || null;
  console.log('[useEarnGasEstimate] Returning result:', {
    estimate: finalEstimate,
    isLoading,
    error: error?.message || null,
    hasOnchainEstimate: !!onchainGasEstimate,
    hasApiEstimate: !!apiGasEstimate,
  });

  return {
    estimate: finalEstimate,
    isLoading,
    error,
  };
}
