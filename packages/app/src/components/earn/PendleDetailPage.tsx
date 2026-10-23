'use client';

import { InformationCircleIcon } from '@heroicons/react/24/outline';
import { BigNumber } from 'ethers';
import Link from 'next/link';
import { useState } from 'react';
import { twMerge } from 'tailwind-merge';
import { useAccount } from 'wagmi';

import type { PendleAction } from '@/app-hooks/earn/pendlePanelUtils';
import { useAvailableActions } from '@/app-hooks/earn/useAvailableActions';
import { useCheckAndShowToS } from '@/app-hooks/earn/useCheckAndShowToS';
import { usePendlePosition } from '@/app-hooks/earn/usePendlePosition';
import { PENDLE_LOGO_URL } from '@/app-lib/earn/constants';
import { DialogWrapper } from '@/bridge/components/common/Dialog2';
import { SafeImage } from '@/bridge/components/common/SafeImage';
import { formatAmount, formatCompactUsd, formatPercentage } from '@/bridge/util/NumberUtils';
import { Card } from '@/components/Card';
import { OpportunityCategory } from '@/earn-api/types';
import type { StandardOpportunityFixedYield } from '@/earn-api/types';

import { EarnBackButtonLabel, earnBackButtonClassName } from './EarnBackButton';
import { EarnTransactionDetailsPopup } from './EarnTransactionDetailsPopup';
import { EarnUserTransactionHistory } from './EarnUserTransactionHistory';
import { HistoricalChart } from './HistoricalChart';
import { PendleActionPanel } from './PendleActionPanel';
import { useEarnTransactionDetailsDialog } from './useEarnTransactionDetailsDialog';

interface PendleMobileActionButtonProps {
  label: string;
  isSelected: boolean;
  disabled?: boolean;
  onClick: () => void;
}

function PendleMobileActionButton({
  label,
  isSelected,
  disabled = false,
  onClick,
}: PendleMobileActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={twMerge(
        'flex-1 rounded flex items-center border-none disabled:border-none justify-center py-3 text-base font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
        isSelected ? 'bg-primary-cta text-white' : 'bg-white/10 text-white/70',
      )}
    >
      {label}
    </button>
  );
}

interface PendleDetailPageProps {
  opportunity: StandardOpportunityFixedYield;
}

export function PendleDetailPage({ opportunity }: PendleDetailPageProps) {
  const [showActionPanel, setShowActionPanel] = useState(false);
  const [selectedAction, setSelectedAction] = useState<PendleAction>('enter');
  const { checkAndShowToS, tosDialogProps } = useCheckAndShowToS();
  const {
    txDetailsIsOpen,
    transactionDetails,
    txDetailsIsLoading,
    showTransactionDetails,
    closeTransactionDetails,
  } = useEarnTransactionDetailsDialog();
  const { address: walletAddress, isConnected } = useAccount();

  const fixedYield = opportunity.fixedYield;
  const requestChainId = opportunity.chainId;
  const {
    hasPosition,
    balance: ptBalance,
    state: positionState,
  } = usePendlePosition(opportunity.id, fixedYield.expiry ?? null, walletAddress, requestChainId);
  const { data: availableActions } = useAvailableActions({
    opportunityId: opportunity.id,
    category: OpportunityCategory.FixedYield,
    userAddress: walletAddress || null,
    chainId: requestChainId,
  });

  const underlyingAssetSymbol =
    opportunity.name?.replace(/^PT\s+/i, '').trim() || opportunity.token || 'PT';

  const fixedApy = fixedYield.detailsImpliedApy;
  const underlyingApy = fixedYield.detailsUnderlyingApy;

  const maturityDate = fixedYield.expiry
    ? new Date(fixedYield.expiry).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '—';

  const mobileHasPosition = !!(hasPosition && isConnected && ptBalance && ptBalance.gt(0));
  const isMarketExpired = fixedYield.expiry ? new Date() >= new Date(fixedYield.expiry) : false;
  const isPositionExpired = positionState === 'ended' || (isMarketExpired && !hasPosition);
  const availableActionIds = new Set(availableActions?.availableActions ?? []);
  const canRedeem = availableActions ? availableActionIds.has('redeem') : mobileHasPosition;
  const canRollover = availableActionIds.has('rollover');
  const canExit = availableActions
    ? availableActionIds.has('exit')
    : mobileHasPosition && !isPositionExpired;

  return (
    <div className="space-y-4 pb-20 lg:pb-4">
      <Link href="/earn/market" className={earnBackButtonClassName}>
        <EarnBackButtonLabel />
      </Link>

      <div className="flex items-center gap-2">
        <div className="text-lg font-medium text-white">{opportunity.name}</div>
        <div className="rounded bg-white/10 px-2 py-1 text-xs text-white">Fixed Yield</div>
        {isMarketExpired && (
          <div className="rounded bg-amber-400/15 px-2 py-1 text-xs font-medium text-amber-400">
            Matured
          </div>
        )}
      </div>

      {mobileHasPosition && (
        <div className="space-y-4 lg:hidden">
          <div className="flex flex-col rounded bg-neutral-100 p-4">
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-white/50">PT Position Value</span>
              <div className="text-[28px] leading-[1.15] font-normal tracking-[-0.56px] text-white/70">
                {formatAmount(ptBalance ?? BigNumber.from(0), {
                  decimals: fixedYield.ptTokenDecimals ?? 18,
                  symbol: `PT${underlyingAssetSymbol}`,
                })}
              </div>
              <span className="text-xs text-white/50">
                {positionState === 'ended' ? 'Maturity Reached' : 'Active'}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-white">Fixed APY</span>
            <span className="text-success text-xs font-medium">
              {fixedApy != null ? formatPercentage(fixedApy) : '—'}
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div
            className={twMerge('grid grid-cols-2 gap-4', !isPositionExpired && 'lg:grid-cols-4')}
          >
            <Card className="flex flex-col gap-3 rounded bg-neutral-50 p-4">
              <span className="text-xs leading-none text-white/50">Protocol</span>
              <div className="flex h-8 items-center gap-2">
                <SafeImage
                  src={PENDLE_LOGO_URL}
                  alt="Pendle"
                  width={20}
                  height={20}
                  className="object-contain"
                  style={{ objectFit: 'contain' }}
                />
                <span className="text-base leading-none font-medium text-white">Pendle</span>
              </div>
            </Card>

            <Card className="flex flex-col gap-3 rounded bg-neutral-50 p-4">
              <span className="text-xs leading-none text-white/50">Maturity Date</span>
              <div className="flex h-8 items-center text-base font-medium text-white">
                {maturityDate}
              </div>
            </Card>

            {!isPositionExpired && (
              <>
                <Card className="flex flex-col gap-3 rounded bg-neutral-50 p-4">
                  <span className="text-xs leading-none text-white/50">TVL</span>
                  <div className="flex h-8 items-center text-base font-medium text-white">
                    {typeof fixedYield.detailsTvlUsd === 'number' &&
                    Number.isFinite(fixedYield.detailsTvlUsd)
                      ? formatCompactUsd(fixedYield.detailsTvlUsd)
                      : '—'}
                  </div>
                </Card>

                <Card className="flex flex-col gap-3 rounded bg-neutral-50 p-4">
                  <span className="text-xs leading-none text-white/50">24h Volume</span>
                  <div className="flex h-8 items-center text-base font-medium text-white">
                    {typeof fixedYield.detailsTradingVolumeUsd === 'number' &&
                    Number.isFinite(fixedYield.detailsTradingVolumeUsd)
                      ? formatCompactUsd(fixedYield.detailsTradingVolumeUsd)
                      : '—'}
                  </div>
                </Card>
              </>
            )}
          </div>

          {isPositionExpired && (
            <div className="rounded bg-neutral-50 p-4">
              <div className="mb-3 flex items-center gap-2">
                <InformationCircleIcon className="h-5 w-5 shrink-0 text-white/50" />
                <h3 className="text-base font-medium text-white">Market Matured</h3>
              </div>
              <p className="text-sm leading-relaxed text-white/50">
                This market reached maturity on {maturityDate}. Principal Tokens (PT) can now be
                redeemed at full face value for the underlying asset, or rolled over into an
                eligible active market to continue earning a fixed yield.
              </p>
            </div>
          )}

          {!isPositionExpired && (
            <>
              <HistoricalChart
                opportunityId={opportunity.id}
                category={OpportunityCategory.FixedYield}
                chainId={requestChainId}
                assetSymbol={underlyingAssetSymbol}
              />

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded bg-neutral-50 p-4">
                  <div className="mb-1 text-xs text-white/50">Fixed APY</div>
                  <div className="text-base font-medium text-white">
                    {fixedApy != null ? formatPercentage(fixedApy) : '—'}
                  </div>
                </div>
                <div className="rounded bg-neutral-50 p-4">
                  <div className="mb-1 text-xs text-white/50">Underlying APY</div>
                  <div className="text-base font-medium text-white">
                    {underlyingApy != null ? formatPercentage(underlyingApy) : '—'}
                  </div>
                </div>
              </div>

              <div className="rounded bg-neutral-50 p-4">
                <h3 className="mb-3 text-base font-medium text-white">
                  Where does the yield come from?
                </h3>
                <p className="text-sm leading-relaxed text-white/50">
                  Users can lock in a fixed rate and redeem for full value at maturity, or sell
                  sooner and accept the prevailing market rate. In exchange for the fixed return,
                  users forfeit variable upside from the underlying asset.
                </p>
              </div>
            </>
          )}

          <EarnUserTransactionHistory
            category={OpportunityCategory.FixedYield}
            opportunityId={opportunity.id}
            opportunityName={opportunity.name ?? opportunity.token}
            chainId={requestChainId}
            protocolName="Pendle"
            protocolLogo={PENDLE_LOGO_URL}
            onTransactionClick={showTransactionDetails}
          />
        </div>

        <div className="hidden space-y-4 lg:block">
          <PendleActionPanel
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
            <PendleActionPanel
              opportunity={opportunity}
              initialAction={selectedAction}
              hidePositionOnMobile={mobileHasPosition}
              checkAndShowToS={checkAndShowToS}
              showTransactionDetails={showTransactionDetails}
            />
          </div>
        </div>
      )}

      {!showActionPanel && (
        <div className="fixed right-0 bottom-0 left-0 z-60 border-t border-white/10 bg-neutral-50 p-4 lg:hidden">
          <div className="flex gap-2">
            {!mobileHasPosition && isMarketExpired ? (
              <div className="flex-1 py-3 text-center text-sm text-white/50">
                This market has matured
              </div>
            ) : !mobileHasPosition ? (
              <button
                type="button"
                onClick={() => {
                  setSelectedAction('enter');
                  setShowActionPanel(true);
                }}
                className="flex flex-1 items-center justify-center rounded border-none bg-primary-cta py-3 text-base font-medium text-white transition-colors disabled:border-none"
              >
                Enter
              </button>
            ) : isPositionExpired ? (
              <>
                <PendleMobileActionButton
                  label="Redeem"
                  isSelected={selectedAction === 'redeem'}
                  disabled={!canRedeem}
                  onClick={() => {
                    setSelectedAction('redeem');
                    setShowActionPanel(true);
                  }}
                />
                <PendleMobileActionButton
                  label="Rollover"
                  isSelected={selectedAction === 'rollover'}
                  disabled={!canRollover}
                  onClick={() => {
                    setSelectedAction('rollover');
                    setShowActionPanel(true);
                  }}
                />
              </>
            ) : (
              <>
                <PendleMobileActionButton
                  label="Enter"
                  isSelected={selectedAction === 'enter'}
                  onClick={() => {
                    setSelectedAction('enter');
                    setShowActionPanel(true);
                  }}
                />
                <PendleMobileActionButton
                  label="Exit"
                  isSelected={selectedAction === 'exit'}
                  disabled={!canExit}
                  onClick={() => {
                    setSelectedAction('exit');
                    setShowActionPanel(true);
                  }}
                />
              </>
            )}
          </div>
        </div>
      )}
      <EarnTransactionDetailsPopup
        isOpen={txDetailsIsOpen}
        onClose={closeTransactionDetails}
        transactionDetails={transactionDetails}
        isLoading={txDetailsIsLoading}
      />
      <DialogWrapper {...tosDialogProps} />
    </div>
  );
}
