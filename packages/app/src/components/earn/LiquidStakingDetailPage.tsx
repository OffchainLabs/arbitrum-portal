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
        <div className="text-lg text-white font-medium">{opportunity.name}</div>
        <div className="text-xs text-white bg-white/10 rounded px-2 py-1">Liquid Staking</div>
      </div>
      {/* Mobile Position Value and Current APY - Only show if user has position */}
      {hasPosition && (
        <div className="lg:hidden space-y-4">
          {/* Position Value Card */}
          <div className="bg-neutral-100 rounded flex flex-col p-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-6">Position Value</span>
              </div>
              <div className="flex flex-col gap-2">
                <div className="text-[28px] font-normal text-white/70 leading-[1.15] tracking-[-0.56px]">
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
          <div className="flex justify-between items-center">
            <span className="text-xs font-medium text-white">Current APY</span>
            <span className="text-xs font-medium text-earn-success">{opportunity.apy}</span>
          </div>
        </div>
      )}
      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column - Opportunity Details */}
        <div className="lg:col-span-2 space-y-4">
          {/* Opportunity Overview Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Token Card */}
            <Card className="rounded flex flex-col gap-3 bg-neutral-50 p-4">
              <span className="text-xs text-white/50 leading-none">Token</span>
              <div className="flex items-center gap-2 h-8">
                <SafeImage
                  src={opportunity.tokenIcon}
                  alt={opportunity.token}
                  width={32}
                  height={32}
                  className="rounded-full"
                />
                <span className="text-base font-medium text-white leading-none">
                  {opportunity.token}
                </span>
              </div>
            </Card>

            {/* Protocol Card */}
            <Card className="rounded flex flex-col gap-3 bg-neutral-50 p-4">
              <span className="text-xs text-white/50 leading-none">Protocol</span>
              <div className="flex items-center gap-2 h-8">
                <SafeImage
                  src={opportunity.protocolIcon}
                  alt={opportunity.protocol}
                  width={32}
                  height={32}
                  className="rounded-full"
                />
                <span className="text-base font-medium text-white leading-none">
                  {opportunity.protocol}
                </span>
              </div>
            </Card>

            {/* TVL Card */}
            <Card className="rounded flex flex-col gap-3 bg-neutral-50 p-4">
              <span className="text-xs text-white/50 leading-none">TVL</span>
              <div className="text-base font-medium text-white h-8 flex items-center">
                {opportunity.tvl}
              </div>
            </Card>

            {/* Current APY Card */}
            <Card className="rounded flex flex-col gap-3 bg-neutral-50 p-4">
              <span className="text-xs text-white/50 leading-none">Current APY</span>
              <div className="text-base font-medium text-white h-8 flex items-center">
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
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="rounded bg-neutral-50 p-4">
              <div className="text-xs text-white/50 mb-1">Base APY</div>
              <div className="text-base font-medium text-white">
                {formatApyBreakdown(opportunity.apyBreakdown?.base)}
              </div>
            </div>
            <div className="rounded bg-neutral-50 p-4">
              <div className="text-xs text-white/50 mb-1">Reward APY</div>
              <div className="text-base font-medium text-white">
                {formatApyBreakdown(opportunity.apyBreakdown?.reward)}
              </div>
            </div>
            <div className="rounded bg-neutral-50 p-4 col-span-2 lg:col-span-1">
              <div className="text-xs text-white/50 mb-1">Total APY</div>
              <div className="text-base font-medium text-white">
                {formatApyBreakdown(opportunity.apyBreakdown?.total)}
              </div>
            </div>
          </div>

          {/* About Section */}
          <div className="rounded bg-neutral-50 p-4">
            <h3 className="text-base font-medium text-white mb-3">
              Where does the yield come from?
            </h3>
            <p className="text-sm text-white/50 leading-relaxed">
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
        <div className="hidden lg:block space-y-4">
          <LiquidStakingActionPanel
            opportunity={opportunityWithPosition}
            checkAndShowToS={checkAndShowToS}
            showTransactionDetails={showTransactionDetails}
          />
        </div>
      </div>
      {/* Mobile Action Panel Overlay */}
      {showActionPanel && (
        <div className="fixed inset-0 bg-overlay z-50 lg:hidden flex flex-col !mt-0">
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
      <div className="fixed bottom-0 left-0 right-0 bg-neutral-50 border-t border-white/10 p-4 lg:hidden z-[60]">
        <div className="flex gap-2">
          <button
            onClick={() => {
              setSelectedAction('buy');
              setShowActionPanel(true);
            }}
            className={twMerge(
              'flex-1 rounded flex items-center border-none disabled:border-none justify-center py-3 text-base font-medium transition-colors',
              selectedAction === 'buy' ? 'bg-primary-cta text-white' : 'bg-white/10 text-white/70',
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
