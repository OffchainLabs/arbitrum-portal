'use client';

import { BigNumber, utils } from 'ethers';
import useSWRImmutable from 'swr/immutable';
import { usePublicClient } from 'wagmi';

import { useETHPrice } from '@/bridge/hooks/useETHPrice';
import { formatAmount, formatUSD } from '@/bridge/util/NumberUtils';
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
}: UseEarnTransactionNetworkFeeParams) {
  const publicClient = usePublicClient({ chainId });
  const { ethToUSD } = useETHPrice();
  const normalizedProvidedNetworkFee = normalizeProvidedNetworkFee(providedNetworkFee);

  const { data: feeEth, ...swr } = useSWRImmutable(
    isOpen && !isLoading && txHash && publicClient
      ? ([txHash, publicClient, 'earn-network-fee'] as const)
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
      return Number(utils.formatEther(feeWei));
    },
    { shouldRetryOnError: false },
  );

  let data: EarnTransactionNetworkFee | null = normalizedProvidedNetworkFee;
  if (typeof feeEth === 'number') {
    const usdValue = ethToUSD(feeEth);
    data = {
      amount: `~${formatAmount(feeEth, { symbol: 'ETH' })}`,
      usd: usdValue > 0 ? formatUSD(usdValue) : undefined,
    };
  }

  return { ...swr, data };
}
