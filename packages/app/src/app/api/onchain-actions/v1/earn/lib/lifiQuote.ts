import type { LiFiStep, TransactionRequest as LiFiTransactionRequest } from '@lifi/sdk';
import { Address, PublicClient, encodeFunctionData, erc20Abi, getAddress, zeroAddress } from 'viem';

import { ChainId } from '@/bridge/types/ChainId';
import { addressesEqual } from '@/bridge/util/AddressUtils';

import type { TransactionStep } from '../types';

type LifiQuoteBuildParams = {
  amount: string;
  inputTokenAddress: string;
  userAddress?: string;
  publicClient: PublicClient;
  step: LiFiStep;
  transactionRequest: Required<Pick<LiFiTransactionRequest, 'to' | 'data'>> &
    Pick<LiFiTransactionRequest, 'value'>;
};

type LifiQuoteBuildResult = {
  transactionSteps: TransactionStep[];
  estimatedGas: string;
  estimatedGasUsd: string;
  receiveAmount: string;
  priceImpact: number;
};

// LiFi liquid-staking flows on Arbitrum typically use 230-470k gas direct via
// the LiFi diamond (0x1231deb6...); aggregator-routed flows (0xdb9b1e94...)
// can spike to ~1.3M.
// Sampled Lido wstETH via LiFi diamond (~300k):
//   https://arbiscan.io/tx/0x7cb99bff05fc8c8a05e0674726e29e75f5fe1408a798ae040b4af036ef21cbac
// Sampled Lido wstETH via aggregator (~1.1-1.3M):
//   https://arbiscan.io/tx/0x8ae4b5e2dec77dce3c3405c229e6c33392cf41039e2567d6f1e29c9d04254c4b
//   https://arbiscan.io/tx/0xc6e188198a79a41a26b6fc5fb0aaab5b79649c6dd1dffa3c471310d0b6c93c30
// Sampled Ether.fi weETH via aggregator (~435k):
//   https://arbiscan.io/tx/0xb40ede2bdcd4ec599963d870f7de6d223fdfc2cdf35b58a924d02c3d35f99c2e
// Use 700k as a middle-ground fallback when on-chain simulation fails.
const LIFI_APPROVAL_GAS_FALLBACK = 80_000;
const LIFI_TRANSACTION_GAS_FALLBACK = 700_000;

async function buildTransactionSteps({
  amount,
  inputTokenAddress,
  userAddress,
  publicClient,
  step,
  transactionRequest,
}: LifiQuoteBuildParams): Promise<TransactionStep[]> {
  const transactionSteps: TransactionStep[] = [];
  let stepNumber = 1;

  const isNativeETH = addressesEqual(inputTokenAddress, zeroAddress);

  if (!isNativeETH && userAddress) {
    const spenderAddress = transactionRequest.to as Address;
    const amountBigInt = BigInt(amount);

    try {
      const allowance = await publicClient.readContract({
        address: getAddress(inputTokenAddress),
        abi: erc20Abi,
        functionName: 'allowance',
        args: [getAddress(userAddress), spenderAddress],
      });

      if (allowance < amountBigInt) {
        const approvalData = encodeFunctionData({
          abi: erc20Abi,
          functionName: 'approve',
          args: [spenderAddress, amountBigInt],
        });

        transactionSteps.push({
          step: stepNumber++,
          type: 'approval',
          to: inputTokenAddress,
          data: approvalData,
          value: '0',
          chainId: ChainId.ArbitrumOne,
          description: `Approve ${step.action.fromToken.symbol}`,
          gasLimitFallback: LIFI_APPROVAL_GAS_FALLBACK,
        });
      }
    } catch (error) {
      throw new Error(`Failed to read allowance: ${String(error)}`);
    }
  }

  const transactionValue = isNativeETH ? transactionRequest.value || '0x0' : '0x0';

  transactionSteps.push({
    step: stepNumber,
    type: 'transaction',
    to: transactionRequest.to,
    data: transactionRequest.data,
    value: transactionValue,
    chainId: ChainId.ArbitrumOne,
    description: `Swap ${step.action.fromToken.symbol} to ${step.action.toToken.symbol}`,
    gasLimitFallback: LIFI_TRANSACTION_GAS_FALLBACK,
  });

  return transactionSteps;
}

function buildQuoteMetrics(step: LiFiStep): Omit<LifiQuoteBuildResult, 'transactionSteps'> {
  const gasCosts = step.estimate.gasCosts?.[0];
  const estimatedGas = gasCosts?.estimate || '0';
  const estimatedGasUsd = String(Number(gasCosts?.amountUSD ?? 0));
  const feeCosts = step.estimate.feeCosts || [];
  const totalFeeUsd = feeCosts.reduce<number>((sum, fee) => sum + Number(fee.amountUSD ?? 0), 0);
  const receiveAmount = step.estimate.toAmount;
  const fromAmountUsd = Number(step.estimate.fromAmountUSD || 0);
  const toAmountUsd = Number(step.estimate.toAmountUSD || 0);
  const gasUsd = Number(gasCosts?.amountUSD || 0);
  const totalFromAmountUsd = fromAmountUsd + gasUsd + totalFeeUsd;

  let priceImpact = 0;
  if (totalFromAmountUsd > 0 && toAmountUsd > 0) {
    const lossPercentage = ((totalFromAmountUsd - toAmountUsd) / totalFromAmountUsd) * 100;
    priceImpact = Math.max(0, lossPercentage) / 100;
  }

  return {
    estimatedGas,
    estimatedGasUsd,
    receiveAmount,
    priceImpact,
  };
}

export async function buildLifiQuoteData(
  params: LifiQuoteBuildParams,
): Promise<LifiQuoteBuildResult> {
  const transactionSteps = await buildTransactionSteps(params);
  const metrics = buildQuoteMetrics(params.step);

  return {
    ...metrics,
    transactionSteps,
  };
}

export function buildLifiQuotePreviewData(step: LiFiStep): LifiQuoteBuildResult {
  return {
    ...buildQuoteMetrics(step),
    transactionSteps: [],
  };
}
