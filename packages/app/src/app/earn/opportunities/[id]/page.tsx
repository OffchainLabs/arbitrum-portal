'use client';

import { ArrowLeft, ChevronDown, Info } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { mockOpportunities } from '@/lib/earn/mock-data';

export default function OpportunityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'stake' | 'withdraw'>('stake');
  const [amount, setAmount] = useState('');
  const [timePeriod, setTimePeriod] = useState<'1D' | '1W' | '1M' | '3M' | '1Y' | 'All'>('1W');

  // Find the opportunity/position by id
  const opportunity = mockOpportunities.find((o) => o.id === params.id);

  if (!opportunity) {
    return <div>Opportunity not found</div>;
  }

  const handleMaxClick = () => {
    setAmount('1000.00'); // Mock max amount
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-[1440px] px-8 py-[66px]">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="mb-6 flex items-center gap-2 text-sm text-[#999999] transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Positions
        </button>

        {/* Header Cards */}
        <div className="mb-6 grid grid-cols-4 gap-4">
          {/* Token Card */}
          <div className="rounded-lg border border-[#262626] bg-[#191919] p-4">
            <p className="mb-3 text-xs text-[#999999]">Token</p>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#333333]">
                <span className="text-xs">ETH</span>
              </div>
              <div>
                <p className="text-sm font-medium">{opportunity.vault}</p>
                <p className="text-xs text-[#999999]">{opportunity.type}</p>
              </div>
            </div>
          </div>

          {/* Protocol Card */}
          <div className="rounded-lg border border-[#262626] bg-[#191919] p-4">
            <p className="mb-3 text-xs text-[#999999]">Protocol</p>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#333333]">
                <span className="text-xs">{opportunity.protocol.charAt(0)}</span>
              </div>
              <p className="text-sm font-medium">{opportunity.protocol}</p>
            </div>
          </div>

          {/* Total Staked Card */}
          <div className="rounded-lg border border-[#262626] bg-[#191919] p-4">
            <p className="mb-3 text-xs text-[#999999]">Total Staked</p>
            <div>
              <p className="text-lg font-bold">$1.2B</p>
              <p className="text-xs text-[#999999]">245,678 ETH</p>
            </div>
          </div>

          {/* Stakers Card */}
          <div className="rounded-lg border border-[#262626] bg-[#191919] p-4">
            <p className="mb-3 text-xs text-[#999999]">Stakers</p>
            <p className="text-lg font-bold">12,456</p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-[1fr_400px] gap-6">
          {/* Left Column - Chart and APR Cards */}
          <div className="space-y-6">
            {/* Price Chart */}
            <div className="rounded-lg border border-[#262626] bg-[#191919] p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-medium">Price Chart</h3>
                <div className="flex gap-2">
                  {(['1D', '1W', '1M', '3M', '1Y', 'All'] as const).map((period) => (
                    <button
                      key={period}
                      onClick={() => setTimePeriod(period)}
                      className={`rounded px-3 py-1 text-xs transition-colors ${
                        timePeriod === period
                          ? 'bg-[#262626] text-white'
                          : 'text-[#999999] hover:text-white'
                      }`}
                    >
                      {period}
                    </button>
                  ))}
                </div>
              </div>
              {/* Mock chart area */}
              <div className="flex h-[300px] items-center justify-center rounded bg-[#0f0f0f] text-[#666666]">
                Chart Placeholder
              </div>
            </div>

            {/* APR Cards */}
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-lg border border-[#262626] bg-[#191919] p-4">
                <div className="mb-2 flex items-center gap-1">
                  <p className="text-xs text-[#999999]">7-day APR</p>
                  <Info className="h-3 w-3 text-[#999999]" />
                </div>
                <p className="text-2xl font-bold text-[#4CAF50]">
                  {opportunity.apy || opportunity.fixedApy}%
                </p>
              </div>

              <div className="rounded-lg border border-[#262626] bg-[#191919] p-4">
                <div className="mb-2 flex items-center gap-1">
                  <p className="text-xs text-[#999999]">15-day APR</p>
                  <Info className="h-3 w-3 text-[#999999]" />
                </div>
                <p className="text-2xl font-bold text-[#4CAF50]">
                  {opportunity.apy
                    ? Number(opportunity.apy) - 0.5
                    : Number(opportunity.fixedApy) - 0.3}
                  %
                </p>
              </div>

              <div className="rounded-lg border border-[#262626] bg-[#191919] p-4">
                <div className="mb-2 flex items-center gap-1">
                  <p className="text-xs text-[#999999]">30-day APR</p>
                  <Info className="h-3 w-3 text-[#999999]" />
                </div>
                <p className="text-2xl font-bold text-[#4CAF50]">
                  {opportunity.apy
                    ? Number(opportunity.apy) - 1
                    : Number(opportunity.fixedApy) - 0.5}
                  %
                </p>
              </div>
            </div>
          </div>

          {/* Right Column - Position Card */}
          <div>
            <div className="rounded-lg border border-[#262626] bg-[#191919] p-6">
              <h3 className="mb-6 text-lg font-bold">Your position</h3>

              {/* Tabs */}
              <div className="mb-6 flex gap-2">
                <button
                  onClick={() => setActiveTab('stake')}
                  className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                    activeTab === 'stake'
                      ? 'bg-[#262626] text-white'
                      : 'bg-transparent text-[#999999] hover:text-white'
                  }`}
                >
                  Stake
                </button>
                <button
                  onClick={() => setActiveTab('withdraw')}
                  className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                    activeTab === 'withdraw'
                      ? 'bg-[#262626] text-white'
                      : 'bg-transparent text-[#999999] hover:text-white'
                  }`}
                >
                  Withdraw
                </button>
              </div>

              {/* Amount Input */}
              <div className="mb-6">
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-xs text-[#999999]">Amount</label>
                  <button
                    onClick={handleMaxClick}
                    className="text-xs text-[#999999] transition-colors hover:text-white"
                  >
                    Max
                  </button>
                </div>
                <div className="relative">
                  <Input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="h-12 border-[#262626] bg-[#0f0f0f] pr-20 text-lg"
                  />
                  <button className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1 rounded bg-[#262626] px-2 py-1 text-sm">
                    <div className="flex h-4 w-4 items-center justify-center rounded-full bg-[#333333]">
                      <span className="text-[10px]">ETH</span>
                    </div>
                    ETH
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </div>
                <p className="mt-1 text-xs text-[#999999]">≈ $0.00 USD</p>
              </div>

              {/* Transaction Details */}
              <div className="mb-6 space-y-3 rounded-lg bg-[#0f0f0f] p-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#999999]">Exchange rate</span>
                  <span>1 ETH = 1.05 {opportunity.vault}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#999999]">Transaction cost</span>
                  <span>≈ $2.50</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1">
                    <span className="text-[#999999]">Reward fee</span>
                    <Info className="h-3 w-3 text-[#999999]" />
                  </div>
                  <span>10%</span>
                </div>
              </div>

              {/* Action Button */}
              <Button
                disabled={!amount}
                className="h-12 w-full bg-white text-sm font-medium text-black hover:bg-white/90 disabled:opacity-50"
              >
                {activeTab === 'stake' ? 'Stake' : 'Withdraw'}
              </Button>

              {/* Info Text */}
              <p className="mt-4 text-center text-xs text-[#666666]">
                You will receive {opportunity.vault} tokens after staking
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
