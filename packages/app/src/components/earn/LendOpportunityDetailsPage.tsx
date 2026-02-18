'use client';

import { ChevronLeftIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

import type { StandardOpportunityDetail } from '@/app-hooks/earn/useOpportunityDetails';
import { SafeImage } from '@/bridge/components/common/SafeImage';
import { Card } from '@/components/Card';

import { ActionPanelPlaceholder } from './ActionPanelPlaceholder';
import { ChartPlaceholder } from './ChartPlaceholder';
import { TransactionHistoryPlaceholder } from './TransactionHistoryPlaceholder';

interface LendOpportunityDetailsPageProps {
  opportunity: StandardOpportunityDetail;
}

export function LendOpportunityDetailsPage({ opportunity }: LendOpportunityDetailsPageProps) {
  const protocolName =
    (opportunity.protocolName ?? opportunity.protocol).charAt(0).toUpperCase() +
    (opportunity.protocolName ?? opportunity.protocol).slice(1);

  const apy30day = (opportunity.apy30day ?? 0) / 100;
  const apy7day = (opportunity.apy7day ?? 0) / 100;
  const tvlUsd = opportunity.tvlUsd ?? 0;

  return (
    <div className="space-y-4 pb-20 lg:pb-4">
      <Link
        href="/earn/market"
        className="inline-flex items-center gap-2 text-white/50 hover:text-white transition-colors"
      >
        <ChevronLeftIcon className="h-5 w-5" />
        Back
      </Link>

      <div className="flex items-center gap-2">
        <div className="text-lg text-white font-medium">{opportunity.name}</div>
        <div className="text-xs text-white bg-white/10 rounded px-2 py-1">Lending</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="rounded-lg flex flex-col gap-3 bg-[#191919] p-4">
              <span className="text-xs text-white/50 leading-none">Token</span>
              <div className="flex items-center gap-2 h-8">
                <SafeImage
                  src={opportunity.assetLogo || ''}
                  alt={opportunity.assetSymbol ?? opportunity.token}
                  width={20}
                  height={20}
                  className="rounded-full"
                />
                <span className="text-base font-medium text-white leading-none">
                  {opportunity.assetSymbol ?? opportunity.token}
                </span>
              </div>
            </Card>

            <Card className="rounded-lg flex flex-col gap-3 bg-[#191919] p-4">
              <span className="text-xs text-white/50 leading-none">Protocol</span>
              <div className="flex items-center gap-2 h-8">
                <SafeImage
                  src={opportunity.protocolLogo || ''}
                  alt={opportunity.protocolName ?? opportunity.protocol}
                  width={20}
                  height={20}
                  className="rounded-full"
                />
                <span className="text-base font-medium text-white leading-none">
                  {protocolName}
                </span>
              </div>
            </Card>

            <Card className="rounded-lg flex flex-col gap-3 bg-[#191919] p-4">
              <span className="text-xs text-white/50 leading-none">TVL</span>
              <div className="text-base font-medium text-white h-8 flex items-center">
                ${(tvlUsd / 1e6).toFixed(1)}M
              </div>
            </Card>

            <Card className="rounded-lg flex flex-col gap-3 bg-[#191919] p-4">
              <span className="text-xs text-white/50 leading-none">Utilization Rate</span>
              <div className="text-base font-medium text-white h-8 flex items-center">
                {opportunity.stakersCount != null
                  ? `${(opportunity.stakersCount / 1000).toFixed(0)}k`
                  : '-'}
              </div>
            </Card>
          </div>

          <ChartPlaceholder label="APY history" />

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="rounded-lg bg-[#191919] p-4">
              <div className="text-xs text-white/50 mb-1">Max LTV</div>
              <div className="text-base font-medium text-white">{(apy7day * 100).toFixed(1)}%</div>
            </div>
            <div className="rounded-lg bg-[#191919] p-4">
              <div className="text-xs text-white/50 mb-1">Liquidation Threshold</div>
              <div className="text-base font-medium text-white">{(apy7day * 100).toFixed(1)}%</div>
            </div>
            <div className="rounded-lg bg-[#191919] p-4 col-span-2 lg:col-span-1">
              <div className="text-xs text-white/50 mb-1">Supply Market Cap</div>
              <div className="text-base font-medium text-white">{(apy30day * 100).toFixed(1)}%</div>
            </div>
          </div>

          {opportunity.description && (
            <div className="rounded-lg bg-[#191919] p-4">
              <h3 className="text-base font-medium text-white mb-3">
                Where does the yield come from?
              </h3>
              <p className="text-sm text-white/50 leading-relaxed">{opportunity.description}</p>
            </div>
          )}

          <TransactionHistoryPlaceholder />
        </div>

        <div className="hidden lg:block space-y-4">
          <ActionPanelPlaceholder />
        </div>
      </div>
    </div>
  );
}
