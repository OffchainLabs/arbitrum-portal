'use client';

import { CheckCircleIcon } from '@heroicons/react/24/solid';
import dayjs from 'dayjs';
import { BigNumber } from 'ethers';
import { useEffect, useState } from 'react';
import { twMerge } from 'tailwind-merge';

import { useEarnTransactionNetworkFee } from '@/app-hooks/earn/useEarnTransactionNetworkFee';
import { Dialog } from '@/bridge/components/common/Dialog';
import { NetworkImage } from '@/bridge/components/common/NetworkImage';
import { SafeImage } from '@/bridge/components/common/SafeImage';
import { normalizeTimestamp } from '@/bridge/state/app/utils';
import { ChainId } from '@/bridge/types/ChainId';
import { formatAmount, formatUSD } from '@/bridge/util/NumberUtils';
import { getExplorerUrl, getNetworkName } from '@/bridge/util/networks';
import { ExternalLink } from '@/components/ExternalLink';

export interface TransactionDetails {
  action: string;
  amount: string;
  tokenSymbol: string;
  decimals: number;
  assetLogo?: string;
  txHash?: string;
  chainId?: number;
  timestamp?: number;
  protocolName?: string;
  protocolLogo?: string;
  networkFee?: {
    amount: string;
    usd?: string;
  };
  opportunityName?: string;
}

interface EarnTransactionDetailsPopupProps {
  isOpen: boolean;
  onClose: () => void;
  transactionDetails: TransactionDetails | null;
  isLoading: boolean;
}

function getExplorerName(chainId: number): string {
  const url = getExplorerUrl(chainId);
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
}

function formatUsdRaw(usdRaw?: string): string | null {
  if (!usdRaw) {
    return null;
  }

  const parsed = Number(usdRaw);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return formatUSD(parsed);
}

function safeBigNumberFromAmount(amount: string): BigNumber {
  try {
    return BigNumber.from(amount || '0');
  } catch {
    return BigNumber.from(0);
  }
}

export function EarnTransactionDetailsPopup({
  isOpen,
  onClose,
  transactionDetails,
  isLoading,
}: EarnTransactionDetailsPopupProps) {
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const chainId = transactionDetails?.chainId || ChainId.ArbitrumOne;
  const { networkFee, isFetchingFee } = useEarnTransactionNetworkFee({
    isOpen,
    isLoading,
    chainId,
    txHash: transactionDetails?.txHash,
    providedNetworkFee: transactionDetails?.networkFee,
  });

  useEffect(() => {
    if (!isLoading && transactionDetails) {
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

  const explorerUrl = getExplorerUrl(chainId);
  const networkName = getNetworkName(chainId);
  const txHash = transactionDetails.txHash;
  const opportunityName = transactionDetails.opportunityName || 'Transaction';

  const formattedDate = transactionDetails.timestamp
    ? dayjs(normalizeTimestamp(transactionDetails.timestamp)).format('MMM D, YYYY h:mm A')
    : dayjs().format('MMM D, YYYY h:mm A');

  const displayNetworkFee = networkFee;
  const formattedNetworkFeeUsd = formatUsdRaw(displayNetworkFee?.usd);
  const explorerName = getExplorerName(chainId);

  const tokenDecimals = transactionDetails.decimals;
  const amountBigNumber = safeBigNumberFromAmount(transactionDetails.amount);

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
        {isLoading && (
          <div className="flex flex-col items-center gap-6 w-full">
            <div className="flex items-center justify-center w-[46px] h-[46px] rounded-full bg-white/5">
              <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin" />
            </div>

            <div className="flex flex-col gap-1.5 items-center justify-center w-full">
              <div className="text-[36px] font-medium text-white text-center tracking-[0.72px]">
                {formattedAmount}
              </div>
            </div>

            <p className="text-sm text-white/50 text-center">
              Please wait while we confirm your transaction...
            </p>
          </div>
        )}

        {!isLoading && (
          <div
            className={twMerge(
              'flex flex-col gap-5 w-full transition-all duration-500',
              showSuccessAnimation ? 'opacity-100 scale-100' : 'opacity-0 scale-95',
            )}
          >
            <div className="flex flex-col gap-2 items-center w-full py-6">
              {transactionDetails.assetLogo ? (
                <div className="relative shrink-0 size-[46px]">
                  <SafeImage
                    src={transactionDetails.assetLogo}
                    alt={transactionDetails.tokenSymbol}
                    className="absolute inset-0 max-w-none object-50%-50% object-cover rounded-full size-full"
                    width={46}
                    height={46}
                    fallback={
                      <div className="absolute inset-0 rounded-full bg-white/10 size-full" />
                    }
                  />
                  {showSuccessAnimation && (
                    <div className="absolute -bottom-1 -right-1 flex items-center justify-center w-5 h-5 bg-earn-success rounded-full animate-in fade-in zoom-in duration-300">
                      <CheckCircleIcon className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center w-[46px] h-[46px] rounded-full bg-white/10">
                  <CheckCircleIcon className="w-[23px] h-[23px] text-earn-success" />
                </div>
              )}

              <div className="flex flex-col gap-1.5 items-center justify-center w-full">
                <div className="text-3xl font-medium text-white text-center">{formattedAmount}</div>
              </div>
            </div>

            <div className="bg-gray-1 flex flex-col gap-2 items-start p-4 rounded-[10px] w-full">
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

              <div className="flex h-[25px] items-center justify-between px-0 py-2 w-full">
                <span className="text-[14px] text-white/50 leading-[1.35] tracking-[-0.28px]">
                  Date
                </span>
                <span className="text-[14px] text-white leading-[1.35] tracking-[-0.28px]">
                  {formattedDate}
                </span>
              </div>

              {transactionDetails.protocolName && (
                <div className="flex h-[25px] items-center justify-between px-0 py-2 w-full">
                  <span className="text-[14px] text-white/50 leading-[1.35] tracking-[-0.28px]">
                    Protocol
                  </span>
                  <div className="flex gap-2 items-center justify-end">
                    {transactionDetails.protocolLogo && (
                      <SafeImage
                        src={transactionDetails.protocolLogo}
                        alt={transactionDetails.protocolName}
                        className="h-[21px] w-[21px] rounded-full"
                        width={21}
                        height={21}
                        fallback={<div className="h-[21px] w-[21px] rounded-full bg-white/10" />}
                      />
                    )}
                    <span className="text-[14px] text-white leading-[1.35] tracking-[-0.28px]">
                      {transactionDetails.protocolName}
                    </span>
                  </div>
                </div>
              )}

              {displayNetworkFee && (
                <div className="flex h-[25px] items-center justify-between px-0 py-2 w-full">
                  <span className="text-[14px] text-white/50 leading-[1.35] tracking-[-0.28px]">
                    Network Fee
                  </span>
                  <span className="text-[14px] text-white leading-[17px] tracking-[0.14px]">
                    {displayNetworkFee.amount}
                    {formattedNetworkFeeUsd ? ` (${formattedNetworkFeeUsd})` : ''}
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

            {txHash && (
              <ExternalLink
                href={`${explorerUrl}/tx/${txHash}`}
                className="bg-neutral-250 flex items-center justify-center px-[15px] py-2.5 h-[59px] rounded-[10px] w-full text-[16px] font-medium text-white text-center hover:opacity-90 cursor-pointer transition-opacity"
              >
                View on {explorerName}
              </ExternalLink>
            )}
          </div>
        )}
      </div>
    </Dialog>
  );
}
