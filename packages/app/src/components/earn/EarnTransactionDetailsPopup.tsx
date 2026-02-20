'use client';

import { CheckCircleIcon } from '@heroicons/react/24/solid';
import dayjs from 'dayjs';
import { BigNumber, utils } from 'ethers';
import { useCallback, useEffect, useState } from 'react';
import { twMerge } from 'tailwind-merge';
import { usePublicClient } from 'wagmi';

import { Dialog } from '@/bridge/components/common/Dialog';
import { NetworkImage } from '@/bridge/components/common/NetworkImage';
import { normalizeTimestamp } from '@/bridge/state/app/utils';
import { ChainId } from '@/bridge/types/ChainId';
import { formatAmount } from '@/bridge/util/NumberUtils';
import { explorerUrls, getNetworkName } from '@/bridge/util/networks';

export interface TransactionDetails {
  action: string; // 'supply', 'withdraw', 'enter', 'exit', 'buy', 'sell'
  amount: string; // Amount in raw units (wei/smallest unit)
  tokenSymbol: string;
  decimals?: number; // Token decimals (defaults to 18 if not provided)
  assetLogo?: string; // Asset/token logo to display
  txHash?: string;
  chainId?: number;
  timestamp?: number; // Unix timestamp in seconds
  protocolName?: string;
  protocolLogo?: string;
  networkFee?: {
    amount: string;
    usd: string;
  };
  opportunityName?: string; // e.g., "Liquid Staked ETH"
}

/**
 * Fetch ETH price in USD from CoinGecko. Returns null on failure.
 */
async function fetchEthPriceUsd(): Promise<number | null> {
  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd',
    );
    const data = await response.json();
    const price = data.ethereum?.usd;
    return typeof price === 'number' && price > 0 ? price : null;
  } catch {
    return null;
  }
}

/**
 * Hook to manage transaction details popup
 * @returns Object with `showTransactionDetails` function, `markAsCompleted` function, and popup component
 */
export function useEarnTransactionDetails() {
  const [isOpen, setIsOpen] = useState(false);
  const [transactionDetails, setTransactionDetails] = useState<TransactionDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const showTransactionDetails = useCallback(
    (details: TransactionDetails, isCompleted: boolean = false) => {
      setTransactionDetails(details);
      // If transaction already has a hash, it's completed (historical transaction)
      setIsLoading(!isCompleted && !details.txHash);
      setIsOpen(true);
    },
    [],
  );

  const markAsCompleted = useCallback(
    (txHash?: string) => {
      setIsLoading(false);
      if (transactionDetails) {
        setTransactionDetails({ ...transactionDetails, txHash });
      }
    },
    [transactionDetails],
  );

  const closeDialog = useCallback(() => {
    setIsOpen(false);
    // Reset state after a short delay to allow animation to complete
    setTimeout(() => {
      setTransactionDetails(null);
      setIsLoading(true);
    }, 300);
  }, []);

  return {
    showTransactionDetails,
    markAsCompleted,
    transactionDetails,
    isLoading,
    EarnTransactionDetailsPopupComponent: () => (
      <EarnTransactionDetailsPopup
        isOpen={isOpen}
        onClose={closeDialog}
        transactionDetails={transactionDetails}
        isLoading={isLoading}
      />
    ),
  };
}

interface EarnTransactionDetailsPopupProps {
  isOpen: boolean;
  onClose: () => void;
  transactionDetails: TransactionDetails | null;
  isLoading: boolean;
}

export function EarnTransactionDetailsPopup({
  isOpen,
  onClose,
  transactionDetails,
  isLoading,
}: EarnTransactionDetailsPopupProps) {
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [networkFee, setNetworkFee] = useState<{ amount: string; usd: string } | null>(null);
  const [isFetchingFee, setIsFetchingFee] = useState(false);
  const chainId = transactionDetails?.chainId || ChainId.ArbitrumOne;
  const publicClient = usePublicClient({ chainId });

  // Fetch network fee from transaction receipt
  useEffect(() => {
    const fetchNetworkFee = async () => {
      if (!transactionDetails?.txHash || !publicClient || transactionDetails.networkFee) {
        // Use provided fee if available, or skip if no txHash/client
        if (transactionDetails?.networkFee) {
          setNetworkFee(transactionDetails.networkFee);
        }
        return;
      }

      setIsFetchingFee(true);
      try {
        const receipt = await publicClient.getTransactionReceipt({
          hash: transactionDetails.txHash as `0x${string}`,
        });

        // Calculate fee: gasUsed * effectiveGasPrice
        const gasUsed = BigNumber.from(receipt.gasUsed.toString());
        const effectiveGasPrice = receipt.effectiveGasPrice
          ? BigNumber.from(receipt.effectiveGasPrice.toString())
          : null;

        if (!effectiveGasPrice) {
          // If no effectiveGasPrice, we can't calculate fee accurately
          setIsFetchingFee(false);
          return;
        }

        const feeWei = gasUsed.mul(effectiveGasPrice);
        const feeEth = utils.formatEther(feeWei);
        const feeEthFormatted = parseFloat(feeEth).toFixed(6);

        const ethPrice = await fetchEthPriceUsd();
        const feeUsd =
          ethPrice != null ? `$${(parseFloat(feeEth) * ethPrice).toFixed(2)} USD` : null;

        setNetworkFee({
          amount: `~${feeEthFormatted} ETH`,
          usd: feeUsd ?? '',
        });
      } catch (error) {
        console.error('Failed to fetch network fee:', error);
        // Don't show fee if fetch fails
      } finally {
        setIsFetchingFee(false);
      }
    };

    if (isOpen && !isLoading && transactionDetails) {
      fetchNetworkFee();
    }
  }, [isOpen, isLoading, transactionDetails, publicClient]);

  // Animate to success state when loading completes
  useEffect(() => {
    if (!isLoading && transactionDetails) {
      // Small delay to trigger animation
      const timer = setTimeout(() => {
        setShowSuccessAnimation(true);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setShowSuccessAnimation(false);
    }
  }, [isLoading, transactionDetails]);

  const handleClose = () => {
    setShowSuccessAnimation(false);
    onClose();
  };

  if (!transactionDetails) {
    return null;
  }

  const explorerUrl = explorerUrls[chainId] || 'https://arbiscan.io';
  const networkName = getNetworkName(chainId);
  const txHash = transactionDetails.txHash;
  const opportunityName = transactionDetails.opportunityName || 'Transaction';

  // Format date from timestamp if available, otherwise use current date
  const formattedDate = transactionDetails.timestamp
    ? dayjs(normalizeTimestamp(transactionDetails.timestamp)).format('MMM D, YYYY h:mm A')
    : dayjs().format('MMM D, YYYY h:mm A');

  // Use provided network fee or fetched fee
  const displayNetworkFee = transactionDetails.networkFee || networkFee;

  // Get explorer name based on chainId
  const getExplorerName = (chainId: number): string => {
    const url = explorerUrls[chainId] || explorerUrls[ChainId.ArbitrumOne] || 'https://arbiscan.io';
    if (url.includes('arbiscan.io')) {
      if (url.includes('nova')) return 'Nova Arbiscan';
      if (url.includes('sepolia')) return 'Sepolia Arbiscan';
      return 'Arbiscan';
    }
    if (url.includes('basescan.org')) {
      if (url.includes('sepolia')) return 'Sepolia Basescan';
      return 'Basescan';
    }
    if (url.includes('etherscan.io')) {
      if (url.includes('sepolia')) return 'Sepolia Etherscan';
      return 'Etherscan';
    }
    return 'Explorer';
  };
  const explorerName = getExplorerName(chainId);

  // Get token decimals (default to 18 if not provided)
  // Ensure consistent formatting with detail pages and transaction history table
  const tokenDecimals = transactionDetails.decimals ?? 18;

  // Convert amount string to BigNumber for formatting
  const amountBigNumber = BigNumber.from(transactionDetails.amount || '0');

  // Format amount consistently with detail pages and transaction history table
  const formattedAmount = formatAmount(amountBigNumber, {
    decimals: tokenDecimals,
    symbol: transactionDetails.tokenSymbol,
  });

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title={
        <span className="text-lg font-medium text-white/40 text-center w-full">
          {opportunityName}
        </span>
      }
      closeable={true}
      isFooterHidden={true}
      className="!border-0 md:!max-w-[450px]"
    >
      <div className="flex flex-col gap-6 items-start w-full pb-6">
        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center gap-6 w-full">
            {/* Spinner Icon */}
            <div className="flex items-center justify-center w-[46px] h-[46px] rounded-full bg-white/5">
              <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin" />
            </div>

            {/* Amount Display */}
            <div className="flex flex-col gap-1.5 items-center justify-center w-full">
              <div className="text-[36px] font-medium text-white text-center tracking-[0.72px]">
                {formattedAmount}
              </div>
            </div>

            {/* Loading Text */}
            <p className="text-sm text-white/50 text-center">
              Please wait while we confirm your transaction...
            </p>
          </div>
        )}

        {/* Completed State */}
        {!isLoading && (
          <div
            className={twMerge(
              'flex flex-col gap-5 w-full transition-all duration-500',
              showSuccessAnimation ? 'opacity-100 scale-100' : 'opacity-0 scale-95',
            )}
          >
            {/* Asset Logo and Amount Section */}
            <div className="flex flex-col gap-2 items-center w-full py-6">
              {/* Asset Logo with Tick Animation */}
              {transactionDetails.assetLogo ? (
                <div className="relative shrink-0 size-[46px]">
                  <img
                    src={transactionDetails.assetLogo}
                    alt={transactionDetails.tokenSymbol}
                    className="absolute inset-0 max-w-none object-50%-50% object-cover rounded-full size-full"
                  />
                  {/* Tick Animation Overlay */}
                  {showSuccessAnimation && (
                    <div className="absolute -bottom-1 -right-1 flex items-center justify-center w-5 h-5 bg-[#96d18e] rounded-full animate-in fade-in zoom-in duration-300">
                      <CheckCircleIcon className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center w-[46px] h-[46px] rounded-full bg-white/10">
                  <CheckCircleIcon className="w-[23px] h-[23px] text-[#96d18e]" />
                </div>
              )}

              {/* Amount Display */}
              <div className="flex flex-col gap-1.5 items-center justify-center w-full">
                <div className="text-3xl font-medium text-white text-center">{formattedAmount}</div>
              </div>
            </div>

            {/* Transaction Details Box */}
            <div className="bg-gray-1 flex flex-col gap-2 items-start p-4 rounded-[10px] w-full">
              {/* Network */}
              <div className="flex h-[25px] items-center justify-between px-0 py-2 w-full">
                <span className="text-[14px] text-white/50 leading-[1.35] tracking-[-0.28px]">
                  Network
                </span>
                <div className="flex gap-2 items-center justify-end">
                  <NetworkImage chainId={chainId} className="h-[21px] w-[21px]" />
                  <span className="text-[14px] text-white leading-[1.35] tracking-[-0.28px]">
                    {networkName}
                  </span>
                </div>
              </div>

              {/* Date */}
              <div className="flex h-[25px] items-center justify-between px-0 py-2 w-full">
                <span className="text-[14px] text-white/50 leading-[1.35] tracking-[-0.28px]">
                  Date
                </span>
                <span className="text-[14px] text-white leading-[1.35] tracking-[-0.28px]">
                  {formattedDate}
                </span>
              </div>

              {/* Protocol */}
              {transactionDetails.protocolName && (
                <div className="flex h-[25px] items-center justify-between px-0 py-2 w-full">
                  <span className="text-[14px] text-white/50 leading-[1.35] tracking-[-0.28px]">
                    Protocol
                  </span>
                  <div className="flex gap-2 items-center justify-end">
                    {transactionDetails.protocolLogo && (
                      <img
                        src={transactionDetails.protocolLogo}
                        alt={transactionDetails.protocolName}
                        className="h-[21px] w-[21px] rounded-full"
                      />
                    )}
                    <span className="text-[14px] text-white leading-[1.35] tracking-[-0.28px]">
                      {transactionDetails.protocolName}
                    </span>
                  </div>
                </div>
              )}

              {/* Network Fee */}
              {displayNetworkFee && (
                <div className="flex h-[25px] items-center justify-between px-0 py-2 w-full">
                  <span className="text-[14px] text-white/50 leading-[1.35] tracking-[-0.28px]">
                    Network Fee
                  </span>
                  <span className="text-[14px] text-white leading-[17px] tracking-[0.14px]">
                    {displayNetworkFee.amount}
                    {displayNetworkFee.usd ? ` (${displayNetworkFee.usd})` : ''}
                  </span>
                </div>
              )}
              {isFetchingFee && !displayNetworkFee && (
                <div className="flex h-[25px] items-center justify-between px-0 py-2 w-full">
                  <span className="text-[14px] text-white/50 leading-[1.35] tracking-[-0.28px]">
                    Network Fee
                  </span>
                  <span className="text-[14px] text-white/50 leading-[17px] tracking-[0.14px]">
                    Loading...
                  </span>
                </div>
              )}
            </div>

            {/* View on Explorer Button - Only show when txHash is available */}
            {txHash && (
              <button
                onClick={() => {
                  window.open(`${explorerUrl}/tx/${txHash}`, '_blank');
                }}
                className="bg-[#404040] flex items-center justify-center px-[15px] py-2.5 h-[59px] rounded-[10px] w-full text-[16px] font-medium text-white text-center hover:opacity-90 cursor-pointer transition-opacity"
              >
                View on {explorerName}
              </button>
            )}
          </div>
        )}
      </div>
    </Dialog>
  );
}
