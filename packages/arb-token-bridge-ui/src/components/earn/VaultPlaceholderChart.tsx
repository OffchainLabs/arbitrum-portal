'use client';

import { DetailedVault } from 'arb-token-bridge-ui/src/types/vaults';

import { Card } from '@/components/Card';

export function VaultPlaceholderChart({ vault }: { vault: DetailedVault }) {
  return (
    <Card className="rounded-lg bg-[#191919] p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center bg-white/5 rounded-lg p-1 gap-2">
          <button className="px-3 py-1 text-xs rounded bg-white text-black">Token Price</button>
          <button className="px-3 py-1 text-xs rounded text-white">APY</button>
          <button className="px-3 py-1 text-xs rounded text-white">TVL</button>
        </div>
      </div>

      <div className="mb-4">
        <div className="text-2xl text-white font-medium">
          ${parseFloat(vault.asset.assetPriceInUsd || '0').toFixed(2)}
        </div>
        <div className="inline-flex items-center gap-2 rounded bg-[#96d18e0d] text-[#96d18e] px-3 py-1 text-xs font-bold">
          +2.64%
        </div>
      </div>

      <div className="h-64 bg-black/20 rounded-lg flex items-center justify-center mb-4">
        <div className="text-gray-500">Price Chart Placeholder</div>
      </div>

      <div className="flex items-center bg-white/5 rounded-lg p-1 gap-1 w-48 ml-auto">
        <button className="px-3 py-1 text-xs rounded bg-white text-black">1D</button>
        <button className="px-3 py-1 text-xs rounded text-white">7D</button>
        <button className="px-3 py-1 text-xs rounded text-white">1M</button>
        <button className="px-3 py-1 text-xs rounded text-white">1Y</button>
      </div>
    </Card>
  );
}
