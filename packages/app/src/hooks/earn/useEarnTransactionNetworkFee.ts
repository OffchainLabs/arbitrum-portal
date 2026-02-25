import { BigNumber, utils } from 'ethers';
import { useEffect, useState } from 'react';
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
  const [networkFee, setNetworkFee] = useState<EarnTransactionNetworkFee | null>(null);
  const [isFetchingFee, setIsFetchingFee] = useState(false);

  useEffect(() => {
    if (!isOpen || isLoading) {
      return;
    }

    if (providedNetworkFee) {
      setNetworkFee(providedNetworkFee);
      setIsFetchingFee(false);
      return;
    }

    if (!txHash || !publicClient) {
      setNetworkFee(null);
      setIsFetchingFee(false);
      return;
    }

    let isCancelled = false;
    const fetchNetworkFee = async () => {
      setIsFetchingFee(true);
      try {
        const receipt = await publicClient.getTransactionReceipt({
          hash: txHash as `0x${string}`,
        });

        const gasUsed = BigNumber.from(receipt.gasUsed.toString());
        const effectiveGasPrice = receipt.effectiveGasPrice
          ? BigNumber.from(receipt.effectiveGasPrice.toString())
          : null;

        if (!effectiveGasPrice) {
          if (!isCancelled) {
            setNetworkFee(null);
          }
          return;
        }

        const feeWei = gasUsed.mul(effectiveGasPrice);
        const feeEth = Number(utils.formatEther(feeWei));
        const feeEthFormatted = Number.isFinite(feeEth) ? feeEth.toFixed(6) : '0.000000';

        if (!isCancelled) {
          setNetworkFee({
            amount: `~${feeEthFormatted} ETH`,
          });
        }
      } catch (error) {
        console.error('Failed to fetch network fee:', error);
        if (!isCancelled) {
          setNetworkFee(null);
        }
      } finally {
        if (!isCancelled) {
          setIsFetchingFee(false);
        }
      }
    };

    fetchNetworkFee();

    return () => {
      isCancelled = true;
    };
  }, [isLoading, isOpen, providedNetworkFee, publicClient, txHash]);

  return { networkFee, isFetchingFee };
}
