'use client';

import { useAccount } from 'wagmi';

import { useUserPositions } from '../../hooks/earn';
import { PortfolioSummaryCards } from './PortfolioSummaryCards';
import { PositionsTable } from './PositionsTable';

export function MyPositionsPage() {
  const { address, isConnected } = useAccount();
  const { opportunities, isLoading, error } = useUserPositions(address || null, [
    'arbitrum',
    'mainnet',
  ]);

  // Not connected state
  if (!isConnected) {
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-900 p-8 text-center">
        <p className="text-gray-400">Connect your wallet to see your positions.</p>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-700 border-t-white"></div>
        <span className="ml-3 text-gray-400">Loading your positions...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="rounded-lg border border-red-900 bg-red-900/20 p-8 text-center">
        <p className="text-red-400">Failed to load positions: {error}</p>
      </div>
    );
  }

  // Empty state
  if (opportunities.length === 0) {
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-900 p-8 text-center">
        <p className="text-gray-400">
          No active positions found. Explore opportunities in the Market tab.
        </p>
      </div>
    );
  }

  // Show positions table with summary cards
  return (
    <div className="space-y-6">
      <PortfolioSummaryCards opportunities={opportunities} />
      <PositionsTable positions={opportunities} />
    </div>
  );
}
