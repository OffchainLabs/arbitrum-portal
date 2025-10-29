'use client';

import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { SafeImage } from 'arb-token-bridge-ui/src/components/common/SafeImage';
import { useVaultDetails } from 'arb-token-bridge-ui/src/hooks/earn';
import Link from 'next/link';

import { Card } from '@/components/Card';

import { VaultActionPanel } from './VaultActionPanel';

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

  // Format network name
  const networkName =
    vault.network.name === 'mainnet'
      ? 'Ethereum'
      : vault.network.name.charAt(0).toUpperCase() + vault.network.name.slice(1);

  // Format protocol name
  const protocolName = vault.protocol.name.charAt(0).toUpperCase() + vault.protocol.name.slice(1);

  // Get APY data
  const apy30day = vault.apy?.['30day']?.total || 0;
  const apy7day = vault.apy?.['7day']?.total || 0;

  // Format TVL
  const tvlUsd = parseFloat(vault.tvl?.usd || '0');

  return (
    <div className="space-y-6">
      {/* Back Navigation */}
      <Link
        href="/earn/market"
        className="inline-flex items-center gap-2 text-blue-500 hover:text-blue-400 transition-colors"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Back to Market
      </Link>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Opportunity Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Opportunity Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Opportunity Card */}
            <Card className="rounded-lg border border-gray-700 bg-gray-900/50 p-4">
              <div className="flex items-center gap-3">
                <SafeImage
                  src={vault.asset.assetLogo || ''}
                  alt={vault.asset.symbol}
                  width={32}
                  height={32}
                  className="rounded-full"
                />
                <div>
                  <div className="text-sm font-medium text-white">{vault.asset.symbol}</div>
                  <div className="text-xs text-gray-400">{vault.name}</div>
                </div>
              </div>
            </Card>

            {/* Protocol Card */}
            <Card className="rounded-lg border border-gray-700 bg-gray-900/50 p-4">
              <div className="flex items-center gap-3">
                <SafeImage
                  src={vault.protocol.protocolLogo || ''}
                  alt={vault.protocol.name}
                  width={32}
                  height={32}
                  className="rounded-full"
                />
                <div>
                  <div className="text-sm font-medium text-white">{protocolName}</div>
                  <div className="text-xs text-gray-400">Protocol</div>
                </div>
              </div>
            </Card>

            {/* TVL Card */}
            <Card className="rounded-lg border border-gray-700 bg-gray-900/50 p-4">
              <div className="text-sm font-medium text-white">${(tvlUsd / 1e6).toFixed(1)}M</div>
              <div className="text-xs text-gray-400">TVL</div>
            </Card>

            {/* Stakers Card */}
            <Card className="rounded-lg border border-gray-700 bg-gray-900/50 p-4">
              <div className="text-sm font-medium text-white">
                {vault.holdersData?.totalCount
                  ? `${(vault.holdersData.totalCount / 1000).toFixed(0)}k`
                  : '-'}
              </div>
              <div className="text-xs text-gray-400">Stakers</div>
            </Card>
          </div>

          {/* Token Price & Graph Section */}
          <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex space-x-1">
                <button className="px-3 py-1 text-sm bg-gray-800 text-white rounded">
                  Token Price
                </button>
                <button className="px-3 py-1 text-sm text-gray-400 hover:text-white rounded">
                  APY
                </button>
                <button className="px-3 py-1 text-sm text-gray-400 hover:text-white rounded">
                  TVL
                </button>
              </div>
            </div>

            {/* Price Display */}
            <div className="mb-4">
              <div className="text-3xl font-bold text-white">
                ${parseFloat(vault.asset.assetPriceInUsd || '0').toFixed(2)}
              </div>
              <div className="text-sm text-gray-400">-2.64%</div>
            </div>

            {/* Placeholder Graph */}
            <div className="h-64 bg-gray-800 rounded-lg flex items-center justify-center mb-4">
              <div className="text-gray-500">Price Chart Placeholder</div>
            </div>

            {/* Time Range Selectors */}
            <div className="flex space-x-2">
              <button className="px-3 py-1 text-sm bg-gray-800 text-white rounded">1d</button>
              <button className="px-3 py-1 text-sm text-gray-400 hover:text-white rounded">
                7d
              </button>
              <button className="px-3 py-1 text-sm text-gray-400 hover:text-white rounded">
                1M
              </button>
              <button className="px-3 py-1 text-sm text-gray-400 hover:text-white rounded">
                1Y
              </button>
            </div>
          </div>

          {/* Rolling APRs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-4">
              <div className="text-sm text-gray-400 mb-1">7 day rolling APR</div>
              <div className="text-lg font-semibold text-white">{(apy7day * 100).toFixed(1)}%</div>
            </div>
            <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-4">
              <div className="text-sm text-gray-400 mb-1">15 day rolling APR</div>
              <div className="text-lg font-semibold text-white">{(apy7day * 100).toFixed(1)}%</div>
            </div>
            <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-4">
              <div className="text-sm text-gray-400 mb-1">30 day rolling APR</div>
              <div className="text-lg font-semibold text-white">{(apy30day * 100).toFixed(1)}%</div>
            </div>
          </div>

          {/* About Section */}
          <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-6">
            <h3 className="text-lg font-semibold text-white mb-3">About {vault.name}</h3>
            <p className="text-gray-400 leading-relaxed">
              {vault.description ||
                `This is a ${vault.name} opportunity on ${networkName}. Users can earn yield by participating in this protocol.`}
            </p>
          </div>
        </div>

        {/* Right Column - Supply/Transaction */}
        <div className="space-y-6">
          <VaultActionPanel vault={vault} />
        </div>
      </div>
    </div>
  );
}
