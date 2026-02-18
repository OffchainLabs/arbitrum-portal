import { useLocalStorage } from '@rehooks/local-storage';
import { BigNumber } from 'ethers';
import Link from 'next/link';
import { useCallback, useState } from 'react';
import { twMerge } from 'tailwind-merge';
import { useAccount } from 'wagmi';

import { useAvailableActions } from '@/app-hooks/earn/useAvailableActions';
import { EARN_TOS_LOCALSTORAGE_KEY } from '@/app-lib/earn/constants';
import { OpportunityCategory } from '@/app-types/earn/vaults';
import { DialogWrapper, useDialog2 } from '@/bridge/components/common/Dialog2';
import { SafeImage } from '@/bridge/components/common/SafeImage';
import { formatAmount, formatCompactNumber, formatCompactUsd, formatUSD } from '@/bridge/util/NumberUtils';
import { Card } from '@/components/Card';
import { type StandardOpportunityLend } from '@/earn-api/types';

import { ChartPlaceholder } from './ChartPlaceholder';
import { EarnBackButtonLabel, earnBackButtonClassName } from './EarnBackButton';
import { EarnToSPopupDialog } from './EarnToSPopupDialog';
import {
  EarnTransactionDetailsPopup,
  type TransactionDetails,
} from './EarnTransactionDetailsPopup';
import { EarnUserTransactionHistory } from './EarnUserTransactionHistory';
import { VaultActionPanel } from './VaultActionPanel';

interface LendOpportunityDetailsPageProps {
  opportunity: StandardOpportunityLend;
}

export function LendOpportunityDetailsPage({ opportunity }: LendOpportunityDetailsPageProps) {
  const [showActionPanel, setShowActionPanel] = useState(false);
  const [selectedAction, setSelectedAction] = useState<'supply' | 'withdraw'>('supply');
  const [tosAccepted, setTosAccepted] = useLocalStorage<boolean>(EARN_TOS_LOCALSTORAGE_KEY, false);
  const [tosDialogProps, tosOpenDialog] = useDialog2();
  const [txDetailsIsOpen, setTxDetailsIsOpen] = useState(false);
  const [transactionDetails, setTransactionDetails] = useState<TransactionDetails | null>(null);
  const [txDetailsIsLoading, setTxDetailsIsLoading] = useState(true);
  const { address: walletAddress, isConnected } = useAccount();
  const requestChainId = opportunity.chainId;

  const { data: availableActions } = useAvailableActions({
    opportunityId: opportunity.id,
    category: OpportunityCategory.Lend,
    userAddress: walletAddress || null,
    chainId: requestChainId,
  });

  const transactionContext = availableActions?.transactionContext;
  const lpToken = transactionContext?.lpToken;
  const lpTokenDecimals = lpToken?.decimals || 18;
  const lpTokenBalanceRaw = BigNumber.from(lpToken?.balanceNative ?? '0');
  const lpTokenUsdValue = parseFloat(lpToken?.balanceUsd ?? '0');
  const hasPosition = isConnected && lpTokenBalanceRaw.gt(0);

  const protocolName = opportunity.lend?.protocolName ?? opportunity.protocol;

  const apy30day = opportunity.lend?.apy30day;
  const apy7day = opportunity.lend?.apy7day;
  const tvlUsd = opportunity.lend?.tvlUsd;
  const formattedTvl =
    typeof tvlUsd === 'number' && Number.isFinite(tvlUsd) ? formatCompactUsd(tvlUsd) : '—';
  const currentApr =
    opportunity.lend?.apy7day != null ? `${opportunity.lend.apy7day.toFixed(2)}%` : '—';

  const checkAndShowToS = useCallback(async (): Promise<boolean> => {
    if (tosAccepted) {
      return true;
    }

    const waitForInput = tosOpenDialog('earn_tos');
    const [confirmed, onCloseData] = await waitForInput();

    if (
      confirmed &&
      onCloseData &&
      typeof onCloseData === 'object' &&
      'tosAccepted' in onCloseData
    ) {
      setTosAccepted(true);
      return true;
    }

    return false;
  }, [setTosAccepted, tosAccepted, tosOpenDialog]);

  const showTransactionDetails = useCallback(
    (details: TransactionDetails, isCompleted: boolean = false) => {
      setTransactionDetails(details);
      setTxDetailsIsLoading(!isCompleted && !details.txHash);
      setTxDetailsIsOpen(true);
    },
    [],
  );

  const closeTransactionDetails = useCallback(() => {
    setTxDetailsIsOpen(false);
    setTimeout(() => {
      setTransactionDetails(null);
      setTxDetailsIsLoading(true);
    }, 300);
  }, []);

  return (
    <div className="space-y-4 pb-20 lg:pb-4">
      <Link href="/earn/market" className={earnBackButtonClassName}>
        <EarnBackButtonLabel />
      </Link>

      <div className="flex items-center gap-2">
        <div className="text-lg text-white font-medium">{opportunity.name}</div>
        <div className="text-xs text-white bg-white/10 rounded px-2 py-1">Lending</div>
      </div>

      {hasPosition && (
        <div className="lg:hidden space-y-4">
          <div className="bg-neutral-100 rounded flex flex-col p-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-white/50">Position Value</span>
              </div>
              <div className="flex flex-col gap-2">
                <div className="text-[28px] font-normal text-white/70 leading-[1.15] tracking-[-0.56px]">
                  {formatAmount(lpTokenBalanceRaw, {
                    decimals: lpTokenDecimals,
                    symbol: opportunity.lend?.assetSymbol ?? opportunity.token,
                  })}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/50">{formatUSD(lpTokenUsdValue)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-xs font-medium text-white">Current APR</span>
            <span className="text-xs font-medium text-earn-success">{currentApr}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="rounded flex flex-col gap-3 bg-gray-1 p-4">
              <span className="text-xs text-white/50 leading-none">Token</span>
              <div className="flex items-center gap-2 h-8">
                <SafeImage
                  src={opportunity.lend?.assetLogo}
                  alt={opportunity.lend?.assetSymbol ?? opportunity.token}
                  width={20}
                  height={20}
                  className="rounded-full"
                  fallback={<span className="w-5 h-5 rounded-full bg-white/10 shrink-0" />}
                />
                <span className="text-base font-medium text-white leading-none">
                  {opportunity.lend?.assetSymbol ?? opportunity.token}
                </span>
              </div>
            </Card>

            <Card className="rounded flex flex-col gap-3 bg-gray-1 p-4">
              <span className="text-xs text-white/50 leading-none">Protocol</span>
              <div className="flex items-center gap-2 h-8">
                <SafeImage
                  src={opportunity.lend?.protocolLogo}
                  alt={opportunity.lend?.protocolName ?? opportunity.protocol}
                  width={20}
                  height={20}
                  className="rounded-full"
                  fallback={<span className="w-5 h-5 rounded-full bg-white/10 shrink-0" />}
                />
                <span className="text-base font-medium text-white leading-none capitalize">
                  {protocolName}
                </span>
              </div>
            </Card>

            <Card className="rounded flex flex-col gap-3 bg-gray-1 p-4">
              <span className="text-xs text-white/50 leading-none">TVL</span>
              <div className="text-base font-medium text-white h-8 flex items-center">
                {formattedTvl}
              </div>
            </Card>

            <Card className="rounded flex flex-col gap-3 bg-gray-1 p-4">
              <span className="text-xs text-white/50 leading-none">Stakers</span>
              <div className="text-base font-medium text-white h-8 flex items-center">
                {opportunity.lend?.stakersCount != null
                  ? formatCompactNumber(opportunity.lend.stakersCount)
                  : '—'}
              </div>
            </Card>
          </div>

          <ChartPlaceholder label="APY history" />

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="rounded bg-gray-1 p-4">
              <div className="text-xs text-white/50 mb-1">7d APY</div>
              <div className="text-base font-medium text-white">
                {typeof apy7day === 'number' && Number.isFinite(apy7day)
                  ? `${apy7day.toFixed(1)}%`
                  : '—'}
              </div>
            </div>
            <div className="rounded bg-gray-1 p-4">
              <div className="text-xs text-white/50 mb-1">30d APY</div>
              <div className="text-base font-medium text-white">
                {typeof apy30day === 'number' && Number.isFinite(apy30day)
                  ? `${apy30day.toFixed(1)}%`
                  : '—'}
              </div>
            </div>
            <div className="rounded bg-gray-1 p-4 col-span-2 lg:col-span-1">
              <div className="text-xs text-white/50 mb-1">TVL (Total Value Locked)</div>
              <div className="text-base font-medium text-white">{formattedTvl}</div>
            </div>
          </div>

          {opportunity.lend?.description && (
            <div className="rounded bg-gray-1 p-4">
              <h3 className="text-base font-medium text-white mb-3">
                Where does the yield come from?
              </h3>
              <p className="text-sm text-white/50 leading-relaxed">
                {opportunity.lend.description}
              </p>
            </div>
          )}

          <EarnUserTransactionHistory
            category={OpportunityCategory.Lend}
            opportunityId={opportunity.id}
            opportunityName={opportunity.name ?? opportunity.id}
            chainId={requestChainId}
            protocolName={protocolName}
            protocolLogo={opportunity.lend?.protocolLogo}
            onTransactionClick={showTransactionDetails}
          />
        </div>

        <div className="hidden lg:block space-y-4">
          <VaultActionPanel
            opportunity={opportunity}
            checkAndShowToS={checkAndShowToS}
            showTransactionDetails={showTransactionDetails}
          />
        </div>
      </div>

      {showActionPanel && (
        <div className="fixed inset-0 bg-overlay z-[70] lg:hidden flex flex-col !mt-0">
          <div className="flex items-center p-4">
            <button
              onClick={() => setShowActionPanel(false)}
              className="inline-flex items-center gap-2 text-white/50 hover:text-white transition-colors"
            >
              <ChevronLeftIcon className="h-5 w-5" />
              Back
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            <VaultActionPanel
              opportunity={opportunity}
              initialAction={selectedAction}
              hidePositionOnMobile={!!hasPosition}
              checkAndShowToS={checkAndShowToS}
              showTransactionDetails={showTransactionDetails}
            />
          </div>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 bg-gray-1 border-t border-white/10 p-4 lg:hidden z-[60]">
        <div className="flex gap-2">
          <button
            onClick={() => {
              setSelectedAction('supply');
              setShowActionPanel(true);
            }}
            className={twMerge(
              'flex-1 rounded flex items-center border-none disabled:border-none justify-center py-3 text-base font-medium transition-colors',
              selectedAction === 'supply'
                ? 'bg-primary-cta text-white'
                : 'bg-white/10 text-white/70',
            )}
          >
            Supply
          </button>
          {hasPosition && (
            <button
              onClick={() => {
                setSelectedAction('withdraw');
                setShowActionPanel(true);
              }}
              className={twMerge(
                'flex-1 rounded flex items-center border-none disabled:border-none justify-center py-3 text-base font-medium transition-colors',
                selectedAction === 'withdraw'
                  ? 'bg-primary-cta text-white'
                  : 'bg-white/10 text-white/70',
              )}
            >
              Withdraw
            </button>
          )}
        </div>
      </div>

      {tosDialogProps.openedDialogType === 'earn_tos' ? (
        <EarnToSPopupDialog {...tosDialogProps} isOpen />
      ) : (
        <DialogWrapper {...tosDialogProps} />
      )}
      <EarnTransactionDetailsPopup
        isOpen={txDetailsIsOpen}
        onClose={closeTransactionDetails}
        transactionDetails={transactionDetails}
        isLoading={txDetailsIsLoading}
      />
    </div>
  );
}
