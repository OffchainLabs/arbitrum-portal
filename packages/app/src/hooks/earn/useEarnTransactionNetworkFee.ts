'use client';

import { BigNumber, utils } from 'ethers';
import useSWRImmutable from 'swr/immutable';
import { usePublicClient } from 'wagmi';

export interface EarnTransactionNetworkFee {
  amount: string;
  usd?: string;
}

interface UseEarnTransactionNetworkFeeParams {
  isOpen: boolean;
  isLoading: boolean;
  chainId?: number;
  txHash?: string;
  providedNetworkFee?: EarnTransactionNetworkFee;
}

interface UseEarnTransactionNetworkFeeResult {
  networkFee: EarnTransactionNetworkFee | null;
  isFetchingFee: boolean;
}

export function useEarnTransactionNetworkFee({
  isOpen,
  isLoading,
  chainId,
  txHash,
  providedNetworkFee,
}: UseEarnTransactionNetworkFeeParams): UseEarnTransactionNetworkFeeResult {
  const publicClient = usePublicClient({ chainId });
  const feeKey =
    !providedNetworkFee && isOpen && !isLoading && txHash && chainId
      ? (['earn-network-fee', chainId, txHash] as const)
      : null;

  const { data: fetchedNetworkFee, isLoading: isFetchingFee } =
    useSWRImmutable<EarnTransactionNetworkFee | null>(
      feeKey,
      async ([, , keyTxHash]) => {
        if (!publicClient) {
          return null;
        }

        const receipt = await publicClient.getTransactionReceipt({
          hash: keyTxHash as `0x${string}`,
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
        const feeEthFormatted = Number.isFinite(feeEth) ? feeEth.toFixed(6) : '0.000000';
        return {
          amount: `~${feeEthFormatted} ETH`,
        };
      },
      {
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        shouldRetryOnError: false,
      },
    );

  return {
    networkFee: providedNetworkFee ?? fetchedNetworkFee ?? null,
    isFetchingFee: !providedNetworkFee && isFetchingFee,
  };
}
