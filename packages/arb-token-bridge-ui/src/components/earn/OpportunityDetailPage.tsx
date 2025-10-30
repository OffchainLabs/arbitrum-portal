'use client';

import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { SafeImage } from 'arb-token-bridge-ui/src/components/common/SafeImage';
import { useVaultDetails } from 'arb-token-bridge-ui/src/hooks/earn';
import Link from 'next/link';

import { Card } from '@/components/Card';

import { VaultActionPanel } from './VaultActionPanel';
import { VaultChart } from './VaultChart';
import { VaultUserTransactionsHistory } from './VaultUserTransactionsHistory';

interface OpportunityDetailPageProps {
  opportunityId: string;
}

export function OpportunityDetailPage({ opportunityId }: OpportunityDetailPageProps) {
  const { vault, isLoading, error } = useVaultDetails(opportunityId, 'arbitrum');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-700 border-t-white"></div>
        <span className="ml-3 text-gray-400">Loading opportunity details...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-900 bg-red-900/20 p-8 text-center">
        <p className="text-red-400">Failed to load opportunity: {error}</p>
      </div>
    );
  }

  if (!vault) {
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-900 p-8 text-center">
        <p className="text-gray-400">Opportunity not found.</p>
      </div>
    );
  }

  // Format protocol name
  const protocolName = vault.protocol.name.charAt(0).toUpperCase() + vault.protocol.name.slice(1);

  // Get APY data
  const apy30day = vault.apy?.['30day']?.total || 0;
  const apy7day = vault.apy?.['7day']?.total || 0;

  // Format TVL
  const tvlUsd = parseFloat(vault.tvl?.usd || '0');

  return (
    <div className="space-y-4">
      {/* Back Navigation */}
      <Link
        href="/earn/market"
        className="inline-flex items-center gap-2 text-white/50 hover:text-white transition-colors"
      >
        <ArrowLeftIcon className="h-5 w-5" />
        Back
      </Link>

      {/* Header Row */}
      <div className="flex items-center gap-2">
        <div className="text-lg text-white font-medium">{vault.name}</div>
        <div className="text-xs text-white bg-white/10 rounded px-2 py-1">Lending</div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column - Opportunity Details */}
        <div className="lg:col-span-2 space-y-4">
          {/* Opportunity Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Opportunity Card */}
            <Card className="rounded-lg flex flex-col gap-3 bg-[#191919] p-4">
              <span className="text-xs text-white/50 leading-none">Token</span>
              <div className="flex items-center gap-2">
                <SafeImage
                  src={vault.asset.assetLogo || ''}
                  alt={vault.asset.symbol}
                  width={20}
                  height={20}
                  className="rounded-full"
                />
                <span className="text-base font-medium text-white leading-none">
                  {vault.asset.symbol}
                </span>
              </div>
            </Card>

            {/* Protocol Card */}
            <Card className="rounded-lg flex flex-col gap-3 bg-[#191919] p-4">
              <span className="text-xs text-white/50 leading-none">Protocol</span>
              <div className="flex items-center gap-2">
                <SafeImage
                  src={vault.protocol.protocolLogo || ''}
                  alt={vault.protocol.name}
                  width={20}
                  height={20}
                  className="rounded-full"
                />
                <span className="text-base font-medium text-white leading-none">
                  {protocolName}
                </span>
              </div>
            </Card>

            {/* TVL Card */}
            <Card className="rounded-lg flex flex-col gap-3 bg-[#191919] p-4">
              <span className="text-xs text-white/50 leading-none">TVL</span>
              <div className="text-base font-medium text-white">${(tvlUsd / 1e6).toFixed(1)}M</div>
            </Card>

            {/* Stakers Card */}
            <Card className="rounded-lg flex flex-col gap-3 bg-[#191919] p-4">
              <span className="text-xs text-white/50 leading-none">Utilization Rate</span>
              <div className="text-base font-medium text-white">
                {vault.holdersData?.totalCount
                  ? `${(vault.holdersData.totalCount / 1000).toFixed(0)}k`
                  : '-'}
              </div>
            </Card>
          </div>

          <VaultChart vault={vault} />

          {/* Rolling APRs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-lg bg-[#191919] p-4">
              <div className="text-xs text-white/50 mb-1">Max LTV</div>
              <div className="text-base font-medium text-white">{(apy7day * 100).toFixed(1)}%</div>
            </div>
            <div className="rounded-lg bg-[#191919] p-4">
              <div className="text-xs text-white/50 mb-1">Liquidation Threshold</div>
              <div className="text-base font-medium text-white">{(apy7day * 100).toFixed(1)}%</div>
            </div>
            <div className="rounded-lg bg-[#191919] p-4">
              <div className="text-xs text-white/50 mb-1">Supply Market Cap</div>
              <div className="text-base font-medium text-white">{(apy30day * 100).toFixed(1)}%</div>
            </div>
          </div>

          {/* About Section */}
          {vault.description && (
            <div className="rounded-lg bg-[#191919] p-4">
              <h3 className="text-base font-medium text-white mb-3">
                Where does the yield come from?
              </h3>
              <p className="text-sm text-white/50 leading-relaxed">{vault.description} </p>
            </div>
          )}

          <VaultUserTransactionsHistory vault={vault} />
        </div>

        {/* Right Column - Supply/Transaction */}
        <div className="space-y-4">
          <VaultActionPanel vault={vault} />
        </div>
      </div>
    </div>
  );
}
