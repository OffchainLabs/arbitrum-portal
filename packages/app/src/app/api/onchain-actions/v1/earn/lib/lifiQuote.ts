import { Address, PublicClient, encodeFunctionData, getAddress, zeroAddress } from 'viem';
import { readContract } from 'viem/actions';

import { ChainId } from '@/bridge/types/ChainId';

import type { TransactionStep } from '../types';
import { ERC20_ALLOWANCE_ABI, ERC20_APPROVE_ABI } from './erc20Abi';

type LifiQuoteStep = {
  action: {
    fromToken: { symbol: string };
    toToken: { symbol: string };
  };
  estimate: {
    gasCosts?: Array<{ estimate?: string; amountUSD?: string | number | null }>;
    feeCosts?: Array<{ amountUSD?: string | number | null }>;
    toAmount: string;
    fromAmountUSD?: string | number | null;
    toAmountUSD?: string | number | null;
  };
};

type LifiTransactionRequest = {
  to: string;
  data: string;
  value?: string;
};

type LifiQuoteBuildParams = {
  amount: string;
  inputTokenAddress: string;
  userAddress: string;
  publicClient: PublicClient;
  step: LifiQuoteStep;
  transactionRequest: LifiTransactionRequest;
};

type LifiQuoteBuildResult = {
  transactionSteps: TransactionStep[];
  estimatedGas: string;
  estimatedGasUsd: string;
  receiveAmount: string;
  priceImpact: number;
};

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

  const isNativeETH = inputTokenAddress.toLowerCase() === zeroAddress.toLowerCase();

  if (!isNativeETH) {
    const spenderAddress = transactionRequest.to as Address;
    const amountBigInt = BigInt(amount);

    try {
      const allowance = await readContract(publicClient, {
        address: getAddress(inputTokenAddress),
        abi: ERC20_ALLOWANCE_ABI,
        functionName: 'allowance',
        args: [getAddress(userAddress), spenderAddress],
      });

      if (allowance < amountBigInt) {
        const approvalData = encodeFunctionData({
          abi: ERC20_APPROVE_ABI,
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
  });

  return transactionSteps;
}

function buildQuoteMetrics(step: LifiQuoteStep): Omit<LifiQuoteBuildResult, 'transactionSteps'> {
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
