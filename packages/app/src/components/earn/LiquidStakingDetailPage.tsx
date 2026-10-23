'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { twMerge } from 'tailwind-merge';
import { formatUnits, getAddress, isAddress } from 'viem';
import { useAccount, useBalance } from 'wagmi';

import { useCheckAndShowToS } from '@/app-hooks/earn/useCheckAndShowToS';
import { useLiquidStakingTokenPrice } from '@/app-hooks/earn/useLiquidStakingTokenPrice';
import { useUserPositions } from '@/app-hooks/earn/useUserPositions';
import { formatApyBreakdown } from '@/app-lib/earn/utils';
import type { OpportunityTableRow } from '@/app-types/earn/vaults';
import { DialogWrapper } from '@/bridge/components/common/Dialog2';
import { SafeImage } from '@/bridge/components/common/SafeImage';
import { CommonAddress } from '@/bridge/util/CommonAddressUtils';
import { formatAmount, formatUSD } from '@/bridge/util/NumberUtils';
import { Card } from '@/components/Card';
import { getLiquidStakingOpportunity } from '@/earn-api/lib/liquidStaking';
import { OpportunityCategory } from '@/earn-api/types';

import { EarnBackButtonLabel, earnBackButtonClassName } from './EarnBackButton';
import { EarnTransactionDetailsPopup } from './EarnTransactionDetailsPopup';
import { EarnUserTransactionHistory } from './EarnUserTransactionHistory';
import { HistoricalChart } from './HistoricalChart';
import { LiquidStakingActionPanel } from './LiquidStakingActionPanel';
import { useEarnTransactionDetailsDialog } from './useEarnTransactionDetailsDialog';

interface LiquidStakingDetailPageProps {
  opportunity: OpportunityTableRow;
}

export function LiquidStakingDetailPage({ opportunity }: LiquidStakingDetailPageProps) {
  const [showActionPanel, setShowActionPanel] = useState(false);
  const [selectedAction, setSelectedAction] = useState<'buy' | 'sell'>('buy');
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
  const { positionsMap } = useUserPositions(isConnected ? walletAddress : null, [requestChainId]);

  const opportunityWithPosition = useMemo(() => {
    const opportunityId = opportunity.id.toLowerCase();
    const vaultAddress = opportunity.vaultAddress?.toLowerCase();
    const positionData =
      positionsMap.get(opportunityId) ||
      (vaultAddress ? positionsMap.get(vaultAddress) : undefined);

    if (!positionData) {
      return opportunity;
    }

    return {
      ...opportunity,
      deposited: positionData.deposited,
      depositedUsd: positionData.valueUsd,
      projectedEarningsUsd: positionData.projectedEarningsUsd || null,
    } satisfies OpportunityTableRow;
  }, [opportunity, positionsMap]);

  const outputTokenAddress = isAddress(opportunity.id) ? getAddress(opportunity.id) : null;
  const { data: userBalanceData } = useBalance({
    address: walletAddress,
    chainId: opportunity.chainId,
    token: outputTokenAddress ?? undefined,
    query: { enabled: isConnected && !!walletAddress },
  });
  const userBalance = userBalanceData?.value ?? null;
  const outputTokenSymbol = opportunity.token;
  const { priceUsd: tokenPrice } = useLiquidStakingTokenPrice(outputTokenAddress ?? undefined);

  const hasPosition = isConnected && userBalance != null && userBalance > BigInt(0);

  const positionUsdValue = useMemo(() => {
    if (userBalance === null || userBalance <= BigInt(0)) return '—';
    const balanceInTokens = Number(formatUnits(userBalance, 18));
    if (tokenPrice !== null) {
      return formatUSD(balanceInTokens * tokenPrice);
    }

    if (
      typeof opportunityWithPosition.depositedUsd === 'number' &&
      Number.isFinite(opportunityWithPosition.depositedUsd) &&
      opportunityWithPosition.depositedUsd > 0
    ) {
      return formatUSD(opportunityWithPosition.depositedUsd);
    }

    return '—';
  }, [userBalance, tokenPrice, opportunityWithPosition.depositedUsd]);

  const historyOpportunityId = useMemo(() => {
    const initialId = (opportunity.vaultAddress || opportunity.id).toLowerCase();

    if (
      initialId === CommonAddress.ArbitrumOne.WSTETH.toLowerCase() ||
      initialId === CommonAddress.ArbitrumOne.WEETH.toLowerCase()
    ) {
      return initialId;
    }

    if (opportunity.token === 'wstETH') {
      return CommonAddress.ArbitrumOne.WSTETH;
    }
    if (opportunity.token === 'weETH') {
      return CommonAddress.ArbitrumOne.WEETH;
    }

    return opportunity.id;
  }, [opportunity.id, opportunity.token, opportunity.vaultAddress]);

  return (
    <div className="space-y-4 pb-20 lg:pb-4">
      {/* Back Navigation */}
      <Link href="/earn/market" className={earnBackButtonClassName}>
        <EarnBackButtonLabel />
      </Link>
      {/* Header Row */}
      <div className="flex items-center gap-2">
        <div className="text-lg font-medium text-white">{opportunity.name}</div>
        <div className="rounded bg-white/10 px-2 py-1 text-xs text-white">Liquid Staking</div>
      </div>
      {/* Mobile Position Value and Current APY - Only show if user has position */}
      {hasPosition && (
        <div className="space-y-4 lg:hidden">
          {/* Position Value Card */}
          <div className="flex flex-col rounded bg-neutral-100 p-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-6">Position Value</span>
              </div>
              <div className="flex flex-col gap-2">
                <div className="text-[28px] leading-[1.15] font-normal tracking-[-0.56px] text-white/70">
                  {userBalance !== null
                    ? formatAmount(Number(formatUnits(userBalance, 18)), {
                        symbol: outputTokenSymbol,
                      })
                    : ''}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-6">{positionUsdValue}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Current APY */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-white">Current APY</span>
            <span className="text-xs font-medium text-earn-success">{opportunity.apy}</span>
          </div>
        </div>
      )}
      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Left Column - Opportunity Details */}
        <div className="space-y-4 lg:col-span-2">
          {/* Opportunity Overview Cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {/* Token Card */}
            <Card className="flex flex-col gap-3 rounded bg-neutral-50 p-4">
              <span className="text-xs leading-none text-white/50">Token</span>
              <div className="flex h-8 items-center gap-2">
                <SafeImage
                  src={opportunity.tokenIcon}
                  alt={opportunity.token}
                  width={32}
                  height={32}
                  className="rounded-full"
                />
                <span className="text-base leading-none font-medium text-white">
                  {opportunity.token}
                </span>
              </div>
            </Card>

            {/* Protocol Card */}
            <Card className="flex flex-col gap-3 rounded bg-neutral-50 p-4">
              <span className="text-xs leading-none text-white/50">Protocol</span>
              <div className="flex h-8 items-center gap-2">
                <SafeImage
                  src={opportunity.protocolIcon}
                  alt={opportunity.protocol}
                  width={32}
                  height={32}
                  className="rounded-full"
                />
                <span className="text-base leading-none font-medium text-white">
                  {opportunity.protocol}
                </span>
              </div>
            </Card>

            {/* TVL Card */}
            <Card className="flex flex-col gap-3 rounded bg-neutral-50 p-4">
              <span className="text-xs leading-none text-white/50">TVL</span>
              <div className="flex h-8 items-center text-base font-medium text-white">
                {opportunity.tvl}
              </div>
            </Card>

            {/* Current APY Card */}
            <Card className="flex flex-col gap-3 rounded bg-neutral-50 p-4">
              <span className="text-xs leading-none text-white/50">Current APY</span>
              <div className="flex h-8 items-center text-base font-medium text-white">
                {opportunity.apy}
              </div>
            </Card>
          </div>

          <HistoricalChart
            opportunityId={opportunity.id}
            category={OpportunityCategory.LiquidStaking}
            chainId={requestChainId}
            title={opportunity.name}
          />

          {/* Rolling APYs */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            <div className="rounded bg-neutral-50 p-4">
              <div className="mb-1 text-xs text-white/50">Base APY</div>
              <div className="text-base font-medium text-white">
                {formatApyBreakdown(opportunity.apyBreakdown?.base)}
              </div>
            </div>
            <div className="rounded bg-neutral-50 p-4">
              <div className="mb-1 text-xs text-white/50">Reward APY</div>
              <div className="text-base font-medium text-white">
                {formatApyBreakdown(opportunity.apyBreakdown?.reward)}
              </div>
            </div>
            <div className="col-span-2 rounded bg-neutral-50 p-4 lg:col-span-1">
              <div className="mb-1 text-xs text-white/50">Total APY</div>
              <div className="text-base font-medium text-white">
                {formatApyBreakdown(opportunity.apyBreakdown?.total)}
              </div>
            </div>
          </div>

          {/* About Section */}
          <div className="rounded bg-neutral-50 p-4">
            <h3 className="mb-3 text-base font-medium text-white">
              Where does the yield come from?
            </h3>
            <p className="text-sm leading-relaxed text-white/50">
              {getLiquidStakingOpportunity(opportunity.id)?.yieldDescription ?? ''}
            </p>
          </div>

          <EarnUserTransactionHistory
            category={OpportunityCategory.LiquidStaking}
            opportunityId={historyOpportunityId}
            opportunityName={opportunity.name}
            chainId={requestChainId}
            protocolName={opportunity.protocol}
            protocolLogo={opportunity.protocolIcon}
            onTransactionClick={showTransactionDetails}
          />
        </div>

        {/* Right Column - Buy/Sell Transaction */}
        <div className="hidden space-y-4 lg:block">
          <LiquidStakingActionPanel
            opportunity={opportunityWithPosition}
            checkAndShowToS={checkAndShowToS}
            showTransactionDetails={showTransactionDetails}
          />
        </div>
      </div>
      {/* Mobile Action Panel Overlay */}
      {showActionPanel && (
        <div className="fixed inset-0 z-50 mt-0! flex flex-col bg-overlay lg:hidden">
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
            <LiquidStakingActionPanel
              opportunity={opportunityWithPosition}
              initialAction={selectedAction}
              hidePositionOnMobile={!!hasPosition}
              checkAndShowToS={checkAndShowToS}
              showTransactionDetails={showTransactionDetails}
            />
          </div>
        </div>
      )}
      {/* Mobile CTA Buttons - Sticky Bottom */}
      {!showActionPanel && (
        <div className="fixed right-0 bottom-0 left-0 z-60 border-t border-white/10 bg-neutral-50 p-4 lg:hidden">
          <div className="flex gap-2">
            <button
              onClick={() => {
                setSelectedAction('buy');
                setShowActionPanel(true);
              }}
              className={twMerge(
                'flex-1 rounded flex items-center border-none disabled:border-none justify-center py-3 text-base font-medium transition-colors',
                selectedAction === 'buy'
                  ? 'bg-primary-cta text-white'
                  : 'bg-white/10 text-white/70',
              )}
            >
              Buy
            </button>
            {hasPosition && (
              <button
                onClick={() => {
                  setSelectedAction('sell');
                  setShowActionPanel(true);
                }}
                className={twMerge(
                  'flex-1 rounded flex items-center border-none disabled:border-none justify-center py-3 text-base font-medium transition-colors',
                  selectedAction === 'sell'
                    ? 'bg-primary-cta text-white'
                    : 'bg-white/10 text-white/70',
                )}
              >
                Sell
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
