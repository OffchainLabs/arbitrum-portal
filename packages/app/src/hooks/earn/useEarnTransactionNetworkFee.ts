'use client';

import { BigNumber, utils } from 'ethers';
import useSWRImmutable from 'swr/immutable';
import { usePublicClient } from 'wagmi';

import { formatAmount } from '@/bridge/util/NumberUtils';
import type { EarnChainId } from '@/earn-api/types';

export interface EarnTransactionNetworkFee {
  amount: string;
  usd?: string;
}

interface UseEarnTransactionNetworkFeeParams {
  isOpen: boolean;
  isLoading: boolean;
  chainId?: EarnChainId;
  txHash?: string;
  providedNetworkFee?: EarnTransactionNetworkFee;
}

interface UseEarnTransactionNetworkFeeResult {
  networkFee: EarnTransactionNetworkFee | null;
  isFetchingFee: boolean;
}

function normalizeNetworkFeeAmount(amount?: string): string | null {
  const trimmedAmount = amount?.trim();
  if (!trimmedAmount || trimmedAmount === '—' || trimmedAmount === '-') {
    return null;
  }

  if (trimmedAmount.toLowerCase().includes('eth')) {
    return trimmedAmount.startsWith('~') ? trimmedAmount : `~${trimmedAmount}`;
  }

  const numericValue = trimmedAmount.startsWith('~') ? trimmedAmount.slice(1) : trimmedAmount;
  if (/^\d+(\.\d+)?$/.test(numericValue)) {
    return `~${numericValue} ETH`;
  }

  return trimmedAmount;
}

function normalizeProvidedNetworkFee(
  providedNetworkFee?: EarnTransactionNetworkFee,
): EarnTransactionNetworkFee | null {
  const normalizedAmount = normalizeNetworkFeeAmount(providedNetworkFee?.amount);
  if (!normalizedAmount) {
    return null;
  }

  return {
    amount: normalizedAmount,
    usd: providedNetworkFee?.usd,
  };
}

export function useEarnTransactionNetworkFee({
  isOpen,
  isLoading,
  chainId,
  txHash,
  providedNetworkFee,
}: UseEarnTransactionNetworkFeeParams): UseEarnTransactionNetworkFeeResult {
  const publicClient = usePublicClient({ chainId });
  const normalizedProvidedNetworkFee = normalizeProvidedNetworkFee(providedNetworkFee);

  const { data: fetchedNetworkFee, isLoading: isFetchingFee } = useSWRImmutable(
    isOpen && !isLoading && !normalizedProvidedNetworkFee && txHash && publicClient && chainId
      ? ([txHash, publicClient, chainId, 'earn-network-fee'] as const)
      : null,
    async ([_txHash, _publicClient]) => {
      const receipt = await _publicClient.getTransactionReceipt({
        hash: _txHash as `0x${string}`,
      });

      const gasUsed = BigNumber.from(receipt.gasUsed.toString());
      const effectiveGasPrice = receipt.effectiveGasPrice
        ? BigNumber.from(receipt.effectiveGasPrice.toString())
        : null;

      if (!effectiveGasPrice) {
        return null;
      }

      const feeWei = gasUsed.mul(effectiveGasPrice);
      const feeEth = Number(utils.formatEther(feeWei));
      return {
        amount: `~${formatAmount(feeEth, { symbol: 'ETH' })}`,
      };
    },
    { shouldRetryOnError: false },
  );

  return {
    networkFee: fetchedNetworkFee || normalizedProvidedNetworkFee,
    isFetchingFee,
  };
}
