'use client';

import { BigNumber } from 'ethers';
import Link from 'next/link';
import { useState } from 'react';
import { twMerge } from 'tailwind-merge';
import { useAccount } from 'wagmi';

import { useAvailableActions } from '@/app-hooks/earn/useAvailableActions';
import { useCheckAndShowToS } from '@/app-hooks/earn/useCheckAndShowToS';
import { OpportunityCategory } from '@/app-types/earn/vaults';
import { DialogWrapper } from '@/bridge/components/common/Dialog2';
import { SafeImage } from '@/bridge/components/common/SafeImage';
import {
  formatAmount,
  formatCompactNumber,
  formatCompactUsd,
  formatPercentage,
  formatUSD,
} from '@/bridge/util/NumberUtils';
import { Card } from '@/components/Card';
import { type StandardOpportunityLend } from '@/earn-api/types';

import { EarnBackButtonLabel, earnBackButtonClassName } from './EarnBackButton';
import { EarnTransactionDetailsPopup } from './EarnTransactionDetailsPopup';
import { EarnUserTransactionHistory } from './EarnUserTransactionHistory';
import { HistoricalChart } from './HistoricalChart';
import { VaultActionPanel } from './VaultActionPanel';
import { useEarnTransactionDetailsDialog } from './useEarnTransactionDetailsDialog';

interface LendOpportunityDetailsPageProps {
  opportunity: StandardOpportunityLend;
}

export function LendOpportunityDetailsPage({ opportunity }: LendOpportunityDetailsPageProps) {
  const [showActionPanel, setShowActionPanel] = useState(false);
  const [selectedAction, setSelectedAction] = useState<'supply' | 'withdraw'>('supply');
  const { checkAndShowToS, tosDialogProps } = useCheckAndShowToS();
  const {
    txDetailsIsOpen,
    transactionDetails,
    txDetailsIsLoading,
    showTransactionDetails,
    closeTransactionDetails,
  } = useEarnTransactionDetailsDialog();
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
    opportunity.lend?.apy7day != null ? formatPercentage(opportunity.lend.apy7day) : '—';

  return (
    <div className="space-y-4 pb-20 lg:pb-4">
      <Link href="/earn/market" className={earnBackButtonClassName}>
        <EarnBackButtonLabel />
      </Link>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="text-lg font-medium text-white">{opportunity.name}</div>
          <div className="rounded bg-white/10 px-2 py-1 text-xs text-white">Lending</div>
        </div>
        <span className="hidden text-xs text-white/50 lg:block">Powered by Vaults.fyi</span>
      </div>

      {hasPosition && (
        <div className="space-y-4 lg:hidden">
          <div className="flex flex-col rounded bg-neutral-100 p-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-white/50">Position Value</span>
              </div>
              <div className="flex flex-col gap-2">
                <div className="text-[28px] leading-[1.15] font-normal tracking-[-0.56px] text-white/70">
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

          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-white">Current APY</span>
            <span className="text-xs font-medium text-earn-success">{currentApr}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Card className="flex flex-col gap-3 rounded bg-gray-1 p-4">
              <span className="text-xs leading-none text-white/50">Token</span>
              <div className="flex h-8 items-center gap-2">
                <SafeImage
                  src={opportunity.lend?.assetLogo}
                  alt={opportunity.lend?.assetSymbol ?? opportunity.token}
                  width={20}
                  height={20}
                  className="rounded-full"
                  fallback={<span className="h-5 w-5 shrink-0 rounded-full bg-white/10" />}
                />
                <span className="text-base leading-none font-medium text-white">
                  {opportunity.lend?.assetSymbol ?? opportunity.token}
                </span>
              </div>
            </Card>

            <Card className="flex flex-col gap-3 rounded bg-gray-1 p-4">
              <span className="text-xs leading-none text-white/50">Protocol</span>
              <div className="flex h-8 items-center gap-2">
                <SafeImage
                  src={opportunity.lend?.protocolLogo}
                  alt={opportunity.lend?.protocolName ?? opportunity.protocol}
                  width={20}
                  height={20}
                  className="rounded-full"
                  fallback={<span className="h-5 w-5 shrink-0 rounded-full bg-white/10" />}
                />
                <span className="text-base leading-none font-medium text-white capitalize">
                  {protocolName}
                </span>
              </div>
            </Card>

            <Card className="flex flex-col gap-3 rounded bg-gray-1 p-4">
              <span className="text-xs leading-none text-white/50">TVL</span>
              <div className="flex h-8 items-center text-base font-medium text-white">
                {formattedTvl}
              </div>
            </Card>

            <Card className="flex flex-col gap-3 rounded bg-gray-1 p-4">
              <span className="text-xs leading-none text-white/50">Stakers</span>
              <div className="flex h-8 items-center text-base font-medium text-white">
                {opportunity.lend?.stakersCount != null
                  ? formatCompactNumber(opportunity.lend.stakersCount)
                  : '—'}
              </div>
            </Card>
          </div>

          <HistoricalChart
            opportunityId={opportunity.id}
            category={OpportunityCategory.Lend}
            chainId={requestChainId}
            title={opportunity.name}
            assetSymbol={opportunity.lend?.assetSymbol}
          />

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            <div className="rounded bg-gray-1 p-4">
              <div className="mb-1 text-xs text-white/50">7d APY</div>
              <div className="text-base font-medium text-white">
                {typeof apy7day === 'number' && Number.isFinite(apy7day)
                  ? formatPercentage(apy7day)
                  : '—'}
              </div>
            </div>
            <div className="rounded bg-gray-1 p-4">
              <div className="mb-1 text-xs text-white/50">30d APY</div>
              <div className="text-base font-medium text-white">
                {typeof apy30day === 'number' && Number.isFinite(apy30day)
                  ? formatPercentage(apy30day)
                  : '—'}
              </div>
            </div>
            <div className="col-span-2 rounded bg-gray-1 p-4 lg:col-span-1">
              <div className="mb-1 text-xs text-white/50">TVL (Total Value Locked)</div>
              <div className="text-base font-medium text-white">{formattedTvl}</div>
            </div>
          </div>

          {opportunity.lend?.description && (
            <div className="rounded bg-gray-1 p-4">
              <h3 className="mb-3 text-base font-medium text-white">
                Where does the yield come from?
              </h3>
              <p className="text-sm leading-relaxed text-white/50">
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

        <div className="hidden space-y-4 lg:block">
          <VaultActionPanel
            opportunity={opportunity}
            checkAndShowToS={checkAndShowToS}
            showTransactionDetails={showTransactionDetails}
          />
        </div>
      </div>

      {showActionPanel && (
        <div className="fixed inset-0 z-70 mt-0! flex flex-col bg-overlay lg:hidden">
          <div className="flex items-center p-4">
            <button
              type="button"
              onClick={() => setShowActionPanel(false)}
              className={earnBackButtonClassName}
            >
              <EarnBackButtonLabel />
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

      {!showActionPanel && (
        <div className="fixed right-0 bottom-0 left-0 z-60 border-t border-white/10 bg-gray-1 p-4 lg:hidden">
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
      )}

      <DialogWrapper {...tosDialogProps} />

      <EarnTransactionDetailsPopup
        isOpen={txDetailsIsOpen}
        onClose={closeTransactionDetails}
        transactionDetails={transactionDetails}
        isLoading={txDetailsIsLoading}
      />
    </div>
  );
}
