'use client';

import { ChevronRight, Diamond } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { mockPortfolioSummary, mockPositions } from '@/lib/earn/mock-data';

export default function PositionsPage() {
  const router = useRouter();
  const summary = mockPortfolioSummary;
  const positions = mockPositions;

  // For demo: set to true to show empty state
  const hasPositions = positions.length > 0;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-[588px_290px_290px]">
        {!hasPositions ? (
          <>
            {/* Empty State Summary Cards */}
            <div className="h-[174px] rounded-lg border border-[#262626] bg-[#191919] p-[18px]">
              <div className="space-y-3">
                <p className="text-xs leading-4 text-[#999999]">Staked Balance</p>
                <p className="text-[28px] font-bold leading-[35px]">$00.00 USD</p>
              </div>
            </div>

            <div className="h-[174px] rounded-lg border border-[#262626] bg-[#191919] p-[18px]">
              <div className="space-y-3">
                <p className="text-xs leading-4 text-[#999999]">Total Earnings</p>
                <p className="text-[28px] font-bold leading-[35px]">$00.00 USD</p>
              </div>
            </div>

            <div className="h-[174px] rounded-lg border border-[#262626] bg-[#191919] p-[18px]">
              <div className="space-y-3">
                <p className="text-xs leading-4 text-[#999999]">Net APY</p>
                <p className="text-[28px] font-bold leading-[35px]">0%</p>
              </div>
            </div>
          </>
        ) : (
          <>
        {/* Your Positions Card */}
        <div className="h-[174px] rounded-lg border border-[#262626] bg-[#191919]">
          <div className="flex h-full flex-col justify-between p-[18px]">
            <div className="space-y-3">
              <p className="text-xs leading-4 text-[#999999]">Your Positions</p>
              <p className="text-[28px] font-bold leading-[35px]">
                ${summary.totalPositions.toFixed(2)} USD
              </p>
            </div>

            <div className="space-y-3">
              {/* Breakdown Bar */}
              <div className="h-3 w-full overflow-hidden rounded-full">
                <div className="flex h-full">
                  <div
                    className="bg-white"
                    style={{ width: `${summary.breakdown.fixedYield}%` }}
                  />
                  <div
                    className="bg-[#666666]"
                    style={{ width: `${summary.breakdown.lending}%` }}
                  />
                  <div
                    className="bg-[#4D4D4D]"
                    style={{ width: `${summary.breakdown.liquidStaking}%` }}
                  />
                </div>
              </div>

              {/* Legend */}
              <div className="flex gap-4 text-xs leading-[15px] text-[#999999]">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-white" />
                  <span>Fixed Yield</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-[#666666]" />
                  <span>Lending</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-[#4D4D4D]" />
                  <span>Liquid Staking</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Total Earnings Card */}
        <div className="h-[174px] rounded-lg border border-[#262626] bg-[#191919] p-[18px]">
          <div className="space-y-3">
            <p className="text-xs leading-4 text-[#999999]">Total Earnings</p>
            <p className="text-[28px] font-bold leading-[35px]">
              ${summary.totalEarnings.toFixed(2)} USD
            </p>
            <p className="text-sm leading-[18px] text-[#4CAF50]">
              +{summary.netApy}%
            </p>
          </div>
        </div>

        {/* Net APY Card */}
        <div className="h-[174px] rounded-lg border border-[#262626] bg-[#191919] p-[18px]">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs leading-4 text-[#999999]">Net APY</p>
              <p className="text-xs leading-4 text-[#666666]">
                Data powered by Zerion
              </p>
            </div>
            <p className="text-[28px] font-bold leading-[35px] text-[#4CAF50]">
              +{summary.netApy}%
            </p>
          </div>
        </div>
        </>
        )}
      </div>

      {/* Positions Table or Empty State */}
      {!hasPositions ? (
        <>
          {/* Empty State */}
          <div className="mt-4 overflow-hidden rounded-lg border border-[#262626] bg-[#191919]">
            {/* Table Header */}
            <Table>
              <TableHeader>
                <TableRow className="h-8 border-b border-[#262626] hover:bg-transparent">
                  <TableHead className="px-4 text-xs font-normal leading-[15px] text-[#999999]">
                    Type
                  </TableHead>
                  <TableHead className="px-4 text-xs font-normal leading-[15px] text-[#999999]">
                    Vault
                  </TableHead>
                  <TableHead className="px-4 text-xs font-normal leading-[15px] text-[#999999]">
                    APY
                  </TableHead>
                  <TableHead className="px-4 text-xs font-normal leading-[15px] text-[#999999]">
                    Deposited
                  </TableHead>
                  <TableHead className="px-4 text-xs font-normal leading-[15px] text-[#999999]">
                    Earnings
                  </TableHead>
                  <TableHead className="px-4 text-xs font-normal leading-[15px] text-[#999999]">
                    Network
                  </TableHead>
                  <TableHead className="px-4 text-xs font-normal leading-[15px] text-[#999999]">
                    Protocol
                  </TableHead>
                  <TableHead className="px-4 text-xs font-normal leading-[15px] text-[#999999]">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>
            </Table>

            {/* Empty State Content */}
            <div className="flex flex-col items-center justify-center py-20">
              <div className="mb-6 text-[#666666]">
                <Diamond className="h-16 w-16" />
              </div>
              <h3 className="mb-2 text-xl font-bold">No active positions yet</h3>
              <p className="mb-8 max-w-md text-center text-sm text-[#999999]">
                Start exploring earning opportunities by staking, lending, or trying
                fixed yield products.
              </p>
              <Button
                onClick={() => router.push('/earn/opportunities')}
                className="bg-[#262626] hover:bg-[#2b2b2b]"
              >
                Explore Opportunities
              </Button>
            </div>
          </div>

          {/* Suggested Opportunities */}
          <div className="mt-6 grid grid-cols-3 gap-4">
            <div className="flex items-center gap-4 rounded-lg border border-[#262626] bg-[#191919] p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#333333]">
                <span className="text-sm">ETH</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-bold">wsETH</p>
                  <Badge className="bg-orange-500/20 text-xs text-orange-500">
                    Special Offer
                  </Badge>
                </div>
                <p className="text-xs text-[#999999]">Liquid Staking</p>
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-lg border border-[#262626] bg-[#191919] p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#333333]">
                <span className="text-sm">ETH</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-bold">weETH</p>
                  <Badge className="bg-blue-500/20 text-xs text-blue-500">
                    chain icon
                  </Badge>
                </div>
                <p className="text-xs text-[#999999]">Liquid Staking</p>
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-lg border border-[#262626] bg-[#191919] p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#333333]">
                <span className="text-sm">ETH</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-bold">stETH</p>
                  <Badge className="bg-orange-500/20 text-xs text-orange-500">
                    Special Offer
                  </Badge>
                </div>
                <p className="text-xs text-[#999999]">Liquid Staking</p>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="mt-4 overflow-hidden rounded-lg border border-[#262626] bg-[#191919]">
        <Table>
          <TableHeader>
            <TableRow className="h-8 border-b border-[#262626] hover:bg-transparent">
              <TableHead className="px-4 text-xs font-normal leading-[15px] text-[#999999]">
                Type
              </TableHead>
              <TableHead className="px-4 text-xs font-normal leading-[15px] text-[#999999]">
                Vault
              </TableHead>
              <TableHead className="px-4 text-xs font-normal leading-[15px] text-[#999999]">
                <span className="inline-flex items-center gap-1">
                  APY
                  <ChevronRight className="h-3.5 w-3.5 rotate-90" />
                </span>
              </TableHead>
              <TableHead className="px-4 text-xs font-normal leading-[15px] text-[#999999]">
                Deposited
              </TableHead>
              <TableHead className="px-4 text-xs font-normal leading-[15px] text-[#999999]">
                Earnings
              </TableHead>
              <TableHead className="px-4 text-xs font-normal leading-[15px] text-[#999999]">
                Network
              </TableHead>
              <TableHead className="px-4 text-xs font-normal leading-[15px] text-[#999999]">
                Protocol
              </TableHead>
              <TableHead className="px-4 text-xs font-normal leading-[15px] text-[#999999]">
                Action
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {positions.map((position) => (
              <TableRow
                key={position.id}
                className="h-[66px] cursor-pointer border-b border-[#262626] hover:bg-[#1f1f1f]"
                onClick={() => window.location.href = `/earn/opportunities/${position.id}`}
              >
                <TableCell className="px-4 text-sm font-medium leading-5">
                  {position.type}
                </TableCell>
                <TableCell className="px-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#333333]">
                      <span className="text-xs">ETH</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium leading-5">
                        {position.vault}
                      </p>
                      {position.vaultSubtitle && (
                        <p className="text-xs leading-[15px] text-[#999999]">
                          {position.vaultSubtitle}
                        </p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="px-4 text-sm font-medium leading-5">
                  {position.apy}%
                </TableCell>
                <TableCell className="px-4">
                  <div>
                    <p className="text-sm font-medium leading-5">
                      {position.deposited.amount} {position.deposited.token}
                    </p>
                    <p className="text-xs leading-[15px] text-[#999999]">
                      ${position.deposited.usdValue} USD
                    </p>
                  </div>
                </TableCell>
                <TableCell className="px-4">
                  {position.earnings ? (
                    <div>
                      <p className="text-sm font-medium leading-5">
                        {position.earnings.percentage}%
                      </p>
                      <p className="text-xs leading-[15px] text-[#999999]">
                        ${position.earnings.usdValue} USD
                      </p>
                    </div>
                  ) : (
                    <span className="text-[#666666]">-</span>
                  )}
                </TableCell>
                <TableCell className="px-4">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1E88E5]">
                      <span className="text-xs">A</span>
                    </div>
                    <span className="text-sm leading-5">{position.network}</span>
                  </div>
                </TableCell>
                <TableCell className="px-4">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#333333]">
                      <span className="text-xs">
                        {position.protocol.charAt(0)}
                      </span>
                    </div>
                    <span className="text-sm leading-5">{position.protocol}</span>
                  </div>
                </TableCell>
                <TableCell className="px-4">
                  <div className="flex h-8 w-8 items-center justify-center">
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      )}
    </div>
  );
}
