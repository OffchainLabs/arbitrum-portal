import type { IncludedStep, StatusResponse } from '@lifi/types';

import { ChainId } from '@/bridge/types/ChainId';
import { addressesEqual } from '@/bridge/util/AddressUtils';

import type { StandardTransactionHistory } from '../types';

type TransferToken = {
  symbol: string;
  decimals: number;
  logoURI?: string;
  address: string;
};

function includesTargetTokenInSteps(
  steps: IncludedStep[] | undefined,
  normalizedTarget: string,
): boolean {
  if (!steps || steps.length === 0) {
    return false;
  }

  return steps.some(
    (step) =>
      addressesEqual(step.fromToken.address.toLowerCase(), normalizedTarget) ||
      addressesEqual(step.toToken.address.toLowerCase(), normalizedTarget),
  );
}

export function involvesLiquidStakingToken(
  transfer: StatusResponse,
  targetTokenAddress: string,
): boolean {
  const normalizedTarget = targetTokenAddress.toLowerCase();

  if ('sending' in transfer) {
    const sendingIncludedSteps =
      'includedSteps' in transfer.sending && Array.isArray(transfer.sending.includedSteps)
        ? transfer.sending.includedSteps
        : undefined;
    if (includesTargetTokenInSteps(sendingIncludedSteps, normalizedTarget)) {
      return true;
    }
  }

  if ('sending' in transfer && 'receiving' in transfer) {
    const sendingChainId = 'chainId' in transfer.sending ? transfer.sending.chainId : undefined;
    const receivingChainId =
      'chainId' in transfer.receiving ? transfer.receiving.chainId : undefined;

    if (sendingChainId && receivingChainId && sendingChainId === receivingChainId) {
      if ('token' in transfer.sending && transfer.sending.token) {
        const sendingTokenAddress = transfer.sending.token.address.toLowerCase();
        if (sendingTokenAddress === normalizedTarget) {
          return true;
        }
      }

      if ('token' in transfer.receiving && transfer.receiving.token) {
        const receivingTokenAddress = transfer.receiving.token.address.toLowerCase();
        if (receivingTokenAddress === normalizedTarget) {
          return true;
        }
      }

      const receivingIncludedSteps =
        'includedSteps' in transfer.receiving && Array.isArray(transfer.receiving.includedSteps)
          ? transfer.receiving.includedSteps
          : undefined;
      if (includesTargetTokenInSteps(receivingIncludedSteps, normalizedTarget)) {
        return true;
      }
    }
  }

  if ('sending' in transfer && 'token' in transfer.sending && transfer.sending.token) {
    const sendingTokenAddress = transfer.sending.token.address.toLowerCase();
    if (sendingTokenAddress === normalizedTarget) {
      return true;
    }
  }

  return false;
}

function toStandardTransaction(
  transfer: StatusResponse,
  targetTokenAddress: string,
): StandardTransactionHistory | null {
  if (!('sending' in transfer)) {
    return null;
  }

  const sending = transfer.sending;
  const txHash = sending.txHash || '';
  const chainId = 'chainId' in sending ? Number(sending.chainId) : ChainId.ArbitrumOne;
  const timestamp = 'timestamp' in sending ? Number(sending.timestamp) : 0;

  if (!txHash || !Number.isFinite(timestamp) || timestamp <= 0) {
    return null;
  }

  let eventType = 'swap';
  let inputToken: TransferToken | null = null;
  let inputAmount = '0';
  let outputToken: TransferToken | null = null;
  let outputAmount = '0';

  const sendingIncludedSteps =
    'includedSteps' in sending && Array.isArray(sending.includedSteps) ? sending.includedSteps : [];

  if (sendingIncludedSteps.length > 0) {
    const firstStep = sendingIncludedSteps[0];
    const lastStep = sendingIncludedSteps[sendingIncludedSteps.length - 1];
    if (!firstStep || !lastStep) return null;

    const isBuy =
      firstStep.fromToken.address.toLowerCase() !== targetTokenAddress &&
      lastStep.toToken.address.toLowerCase() === targetTokenAddress;
    const isSell =
      firstStep.fromToken.address.toLowerCase() === targetTokenAddress &&
      lastStep.toToken.address.toLowerCase() !== targetTokenAddress;

    if (isBuy) {
      eventType = 'buy';
      inputToken = firstStep.fromToken;
      inputAmount = firstStep.fromAmount;
      outputToken = lastStep.toToken;
      outputAmount = lastStep.toAmount;
    } else if (isSell) {
      eventType = 'sell';
      inputToken = firstStep.fromToken;
      inputAmount = firstStep.fromAmount;
      outputToken = lastStep.toToken;
      outputAmount = lastStep.toAmount;
    } else {
      inputToken = firstStep.fromToken;
      inputAmount = firstStep.fromAmount;
      outputToken = lastStep.toToken;
      outputAmount = lastStep.toAmount;
    }
  } else if ('token' in sending && sending.token) {
    inputToken = sending.token;
    inputAmount = sending.amount || '0';
    if ('receiving' in transfer && 'token' in transfer.receiving && transfer.receiving.token) {
      outputToken = transfer.receiving.token;
      outputAmount = transfer.receiving.amount || '0';
    }
  }

  const displayToken = outputToken || inputToken;
  const displayAmount = outputToken ? outputAmount : inputAmount;
  if (!displayToken) {
    return null;
  }

  return {
    timestamp,
    eventType,
    assetAmountRaw: displayAmount,
    assetSymbol: displayToken.symbol,
    decimals: displayToken.decimals,
    assetLogo: displayToken.logoURI,
    inputAssetAmountRaw: inputToken ? inputAmount : undefined,
    inputAssetSymbol: inputToken?.symbol,
    inputAssetDecimals: inputToken?.decimals,
    inputAssetLogo: inputToken?.logoURI,
    outputAssetAmountRaw: outputToken ? outputAmount : undefined,
    outputAssetSymbol: outputToken?.symbol,
    outputAssetDecimals: outputToken?.decimals,
    outputAssetLogo: outputToken?.logoURI,
    chainId,
    transactionHash: txHash,
  };
}

export function toStandardTransactionHistory(
  transfers: StatusResponse[],
  targetTokenAddress: string,
): StandardTransactionHistory[] {
  const normalizedTarget = targetTokenAddress.toLowerCase();

  const transactions = transfers
    .filter((transfer) => involvesLiquidStakingToken(transfer, normalizedTarget))
    .map((transfer) => toStandardTransaction(transfer, normalizedTarget))
    .filter((transaction): transaction is StandardTransactionHistory => transaction !== null);

  return transactions.sort((a, b) => b.timestamp - a.timestamp);
}
