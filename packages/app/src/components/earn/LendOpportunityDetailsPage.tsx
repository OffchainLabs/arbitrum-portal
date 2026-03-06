import Link from 'next/link';

import { SafeImage } from '@/bridge/components/common/SafeImage';
import { formatCompactNumber, formatCompactUsd } from '@/bridge/util/NumberUtils';
import { Card } from '@/components/Card';
import type { StandardOpportunityLend } from '@/earn-api/types';

import { ActionPanelPlaceholder } from './ActionPanelPlaceholder';
import { ChartPlaceholder } from './ChartPlaceholder';
import { EarnBackButtonLabel, earnBackButtonClassName } from './EarnBackButton';
import { TransactionHistoryPlaceholder } from './TransactionHistoryPlaceholder';

interface LendOpportunityDetailsPageProps {
  opportunity: StandardOpportunityLend;
}

export function LendOpportunityDetailsPage({ opportunity }: LendOpportunityDetailsPageProps) {
  const protocolName = opportunity.lend?.protocolName ?? opportunity.protocol;

  const apy30day = opportunity.lend?.apy30day;
  const apy7day = opportunity.lend?.apy7day;
  const tvlUsd = opportunity.lend?.tvlUsd;
  const formattedTvl =
    typeof tvlUsd === 'number' && Number.isFinite(tvlUsd) ? formatCompactUsd(tvlUsd) : '—';

  return (
    <div className="space-y-4 pb-20 lg:pb-4">
      <Link href="/earn/market" className={earnBackButtonClassName}>
        <EarnBackButtonLabel />
      </Link>

      <div className="flex items-center gap-2">
        <div className="text-lg text-white font-medium">{opportunity.name}</div>
        <div className="text-xs text-white bg-white/10 rounded px-2 py-1">Lending</div>
      </div>

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
                  : '-'}
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

          <TransactionHistoryPlaceholder />
        </div>

        <div className="hidden lg:block space-y-4">
          <ActionPanelPlaceholder />
        </div>
      </div>
    </div>
  );
}
