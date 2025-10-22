import React, { useState } from 'react';

interface LiquidStakingOpportunityDetailProps {
  opportunityId: string;
}

// TODO: Replace with real API data
const mockOpportunityData: Record<string, any> = {
  '1': {
    vault: 'Lido Staked ETH',
    protocol: 'Lido',
    apy: 3.5,
    tvl: '$1.2B',
    token: 'ETH',
    riskScore: 'Low',
  },
  '2': {
    vault: 'Rocket Pool ETH',
    protocol: 'Rocket Pool',
    apy: 3.2,
    tvl: '$800M',
    token: 'ETH',
    riskScore: 'Low',
  },
};

export function LiquidStakingOpportunityDetail({
  opportunityId,
}: LiquidStakingOpportunityDetailProps) {
  const [activeTab, setActiveTab] = useState<'stake' | 'withdraw'>('stake');
  const [stakeAmount, setStakeAmount] = useState('');

  const opportunity = mockOpportunityData[opportunityId];

  if (!opportunity) {
    return <div className="text-white">Opportunity not found</div>;
  }

  return (
    <div className="w-full text-white">
      {/* Header */}
      <div className="mb-6">
        <h1 className="mb-2 text-2xl font-bold">{opportunity.vault}</h1>
        <p className="text-gray-400">{opportunity.protocol}</p>
      </div>

      {/* Stats Cards */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-gray-700 bg-gray-900 p-4">
          <div className="text-sm text-gray-400">APY</div>
          <div className="text-2xl font-bold text-green-500">{opportunity.apy}%</div>
        </div>
        <div className="rounded-lg border border-gray-700 bg-gray-900 p-4">
          <div className="text-sm text-gray-400">TVL</div>
          <div className="text-2xl font-bold">{opportunity.tvl}</div>
        </div>
        <div className="rounded-lg border border-gray-700 bg-gray-900 p-4">
          <div className="text-sm text-gray-400">Risk Score</div>
          <div className="text-2xl font-bold">{opportunity.riskScore}</div>
        </div>
      </div>

      {/* Charts Placeholder */}
      <div className="mb-6 rounded-lg border border-gray-700 bg-gray-900 p-6">
        <div className="mb-4 flex gap-4">
          <button className="rounded bg-gray-700 px-3 py-1 text-sm">30D</button>
          <button className="rounded bg-gray-800 px-3 py-1 text-sm">90D</button>
          <button className="rounded bg-gray-800 px-3 py-1 text-sm">1Y</button>
        </div>
        <div className="flex h-64 items-center justify-center text-gray-500">
          [APY Chart Placeholder]
        </div>
      </div>

      {/* Action Panel */}
      <div className="rounded-lg border border-gray-700 bg-gray-900 p-6">
        {/* Tabs */}
        <div className="mb-6 flex gap-4 border-b border-gray-700">
          <button
            onClick={() => setActiveTab('stake')}
            className={`pb-2 ${activeTab === 'stake' ? 'border-b-2 border-blue-500 text-white' : 'text-gray-400'}`}
          >
            Stake
          </button>
          <button
            onClick={() => setActiveTab('withdraw')}
            className={`pb-2 ${activeTab === 'withdraw' ? 'border-b-2 border-blue-500 text-white' : 'text-gray-400'}`}
          >
            Withdraw
          </button>
        </div>

        {/* Stake Tab Content */}
        {activeTab === 'stake' && (
          <div>
            <div className="mb-4">
              <label className="mb-2 block text-sm text-gray-400">Amount to Stake</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                  placeholder="0.0"
                  className="flex-1 rounded border border-gray-700 bg-gray-800 px-4 py-2 text-white"
                />
                <span className="text-gray-400">{opportunity.token}</span>
              </div>
              <div className="mt-1 text-sm text-gray-500">Balance: 0.0 {opportunity.token}</div>
            </div>

            <div className="mb-4 rounded border border-gray-700 bg-gray-800 p-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">You&apos;ll Receive</span>
                <span className="text-white">~ 0.0 wstETH</span>
              </div>
            </div>

            <button className="w-full rounded bg-blue-600 py-3 font-medium text-white hover:bg-blue-700">
              Connect Wallet
            </button>
          </div>
        )}

        {/* Withdraw Tab Content */}
        {activeTab === 'withdraw' && (
          <div>
            <div className="mb-4">
              <label className="mb-2 block text-sm text-gray-400">Amount to Withdraw</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                  placeholder="0.0"
                  className="flex-1 rounded border border-gray-700 bg-gray-800 px-4 py-2 text-white"
                />
                <span className="text-gray-400">wstETH</span>
              </div>
              <div className="mt-1 text-sm text-gray-500">Your Position: 0.0 wstETH</div>
            </div>

            <button className="w-full rounded bg-blue-600 py-3 font-medium text-white hover:bg-blue-700">
              Connect Wallet
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
