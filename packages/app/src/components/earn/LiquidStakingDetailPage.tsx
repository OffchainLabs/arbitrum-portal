'use client';

import { ChevronLeftIcon } from '@heroicons/react/24/outline';
import { useLocalStorage } from '@rehooks/local-storage';
import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import { formatUnits } from 'viem';
import { useAccount } from 'wagmi';

import { useLiquidStakingPositions } from '@/app-hooks/earn/useLiquidStakingPositions';
import { useLiquidStakingTokenPrice } from '@/app-hooks/earn/useLiquidStakingTokenPrice';
import { EARN_TOS_LOCALSTORAGE_KEY } from '@/app-lib/earn/constants';
import type { OpportunityTableRow } from '@/app-types/earn/vaults';
import { DialogWrapper, useDialog2 } from '@/bridge/components/common/Dialog2';
import { SafeImage } from '@/bridge/components/common/SafeImage';
import { CommonAddress } from '@/bridge/util/CommonAddressUtils';
import { formatAmount, formatUSD } from '@/bridge/util/NumberUtils';
import { Card } from '@/components/Card';
import { OpportunityCategory } from '@/earn-api/types';

import { EarnToSPopupDialog } from './EarnToSPopupDialog';
import {
  EarnTransactionDetailsPopup,
  type TransactionDetails,
} from './EarnTransactionDetailsPopup';
import { EarnUserTransactionHistory } from './EarnUserTransactionHistory';
import { HistoricalChart } from './HistoricalChart';
import { LiquidStakingActionPanel } from './LiquidStakingActionPanel';

interface LiquidStakingDetailPageProps {
  opportunity: OpportunityTableRow;
}

export function LiquidStakingDetailPage({ opportunity }: LiquidStakingDetailPageProps) {
  const [showActionPanel, setShowActionPanel] = useState(false);
  const [selectedAction, setSelectedAction] = useState<'buy' | 'sell'>('buy');
  const [tosAccepted, setTosAccepted] = useLocalStorage<boolean>(EARN_TOS_LOCALSTORAGE_KEY, false);
  const [tosDialogProps, tosOpenDialog] = useDialog2();
  const [txDetailsIsOpen, setTxDetailsIsOpen] = useState(false);
  const [transactionDetails, setTransactionDetails] = useState<TransactionDetails | null>(null);
  const [txDetailsIsLoading, setTxDetailsIsLoading] = useState(true);
  const { isConnected } = useAccount();
  const { wstETHBalance, weETHBalance } = useLiquidStakingPositions();
  const requestChainId = opportunity.chainId;

  const outputTokenAddress = opportunity.id.toLowerCase();
  const outputTokenSymbol = opportunity.token;
  const { priceUsd: tokenPrice } = useLiquidStakingTokenPrice(outputTokenAddress);

  const userBalance = useMemo(() => {
    if (outputTokenAddress === CommonAddress.ArbitrumOne.WSTETH.toLowerCase()) {
      return wstETHBalance;
    } else if (outputTokenAddress === CommonAddress.ArbitrumOne.WEETH.toLowerCase()) {
      return weETHBalance;
    }
    return null;
  }, [outputTokenAddress, wstETHBalance, weETHBalance]);

  const hasPosition = isConnected && userBalance && userBalance.gt(0);

  const positionUsdValue = useMemo(() => {
    if (!userBalance || !userBalance.gt(0) || tokenPrice === null) return '—';
    const balanceInTokens = Number(formatUnits(BigInt(userBalance.toString()), 18));
    return formatUSD(balanceInTokens * tokenPrice);
  }, [userBalance, tokenPrice]);

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

  const formatApyBreakdown = (value: number | undefined) =>
    typeof value === 'number' && Number.isFinite(value) ? `${value.toFixed(1)}%` : '—';

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
      {/* Back Navigation */}
      <Link
        href="/earn/market"
        className="inline-flex items-center gap-2 text-white/50 hover:text-white transition-colors"
      >
        <ChevronLeftIcon className="h-5 w-5" />
        Back
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
                  {formatAmount(userBalance, {
                    decimals: 18,
                    symbol: outputTokenSymbol,
                  })}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-6">{positionUsdValue}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Current APR */}
          <div className="flex justify-between items-center">
            <span className="text-xs font-medium text-white">Current APR</span>
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

            {/* Stakers Card */}
            <Card className="rounded flex flex-col gap-3 bg-neutral-50 p-4">
              <span className="text-xs text-white/50 leading-none">Total Staked</span>
              <div className="text-base font-medium text-white h-8 flex items-center">—</div>
            </Card>
          </div>

          <HistoricalChart
            opportunityId={opportunity.id}
            category={OpportunityCategory.LiquidStaking}
            chainId={requestChainId}
            title={opportunity.name}
          />

          {/* Rolling APRs */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="rounded bg-neutral-50 p-4">
              <div className="text-xs text-white/50 mb-1">Base APR</div>
              <div className="text-base font-medium text-white">
                {formatApyBreakdown(opportunity.apyBreakdown?.base)}
              </div>
            </div>
            <div className="rounded bg-neutral-50 p-4">
              <div className="text-xs text-white/50 mb-1">Reward APR</div>
              <div className="text-base font-medium text-white">
                {formatApyBreakdown(opportunity.apyBreakdown?.reward)}
              </div>
            </div>
            <div className="rounded bg-neutral-50 p-4 col-span-2 lg:col-span-1">
              <div className="text-xs text-white/50 mb-1">Total APR</div>
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
              {opportunity.protocol === 'Lido'
                ? 'Wrapped stETH earns rewards generated from staking on the Ethereum network. stETH is a "liquid staking" token that represents ETH staked through the Lido protocol, including accrued rewards earned through staking.'
                : 'Ether.fi offers a liquid re-staking token, weETH, that enables holders to earn ETH staking rewards and EigenLayer restaking rewards. weETH can be procured by swapping via LiFi.'}
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
            opportunity={opportunity}
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
              onClick={() => setShowActionPanel(false)}
              className="inline-flex items-center gap-2 text-white/50 hover:text-white transition-colors"
            >
              <ChevronLeftIcon className="h-5 w-5" />
              Back
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            <LiquidStakingActionPanel
              opportunity={opportunity}
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
            className={`flex-1 rounded flex items-center justify-center py-3 text-base font-medium transition-colors ${
              selectedAction === 'buy'
                ? 'bg-primary-cta border border-cta-border text-white'
                : 'bg-white/10 border border-white/10 text-white/70'
            }`}
          >
            Buy
          </button>
          {hasPosition && (
            <button
              onClick={() => {
                setSelectedAction('sell');
                setShowActionPanel(true);
              }}
              className={`flex-1 rounded flex items-center justify-center py-3 text-base font-medium transition-colors ${
                selectedAction === 'sell'
                  ? 'bg-primary-cta border border-cta-border text-white'
                  : 'bg-white/10 border border-white/10 text-white/70'
              }`}
            >
              Sell
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
