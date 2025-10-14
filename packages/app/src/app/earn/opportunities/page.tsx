'use client';

import { ChevronRight, Info } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { mockOpportunities } from '@/lib/earn/mock-data';
import { Opportunity } from '@/lib/earn/types';

function OpportunitiesGroup({
  title,
  opportunities,
  columns,
}: {
  title: string;
  opportunities: Opportunity[];
  columns: string[];
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-bold">{title}</h2>
        <Info className="h-4 w-4 text-[#999999]" />
      </div>

      <div className="overflow-hidden rounded-lg border border-[#262626] bg-[#191919]">
        <Table>
          <TableHeader>
            <TableRow className="h-8 border-b border-[#262626] hover:bg-transparent">
              <TableHead className="px-4 text-xs font-normal leading-[15px] text-[#999999]">
                Type
              </TableHead>
              <TableHead className="px-4 text-xs font-normal leading-[15px] text-[#999999]">
                Vault
              </TableHead>
              {columns.map((col) => (
                <TableHead
                  key={col}
                  className="px-4 text-xs font-normal leading-[15px] text-[#999999]"
                >
                  {col}
                  {col === 'APY' || col === 'Fixed APY' ? (
                    <ChevronRight className="ml-1 inline h-3.5 w-3.5 rotate-90" />
                  ) : null}
                </TableHead>
              ))}
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
            {opportunities.map((opp) => (
              <TableRow
                key={opp.id}
                className="h-[66px] cursor-pointer border-b border-[#262626] hover:bg-[#1f1f1f]"
                onClick={() => (window.location.href = `/earn/opportunities/${opp.id}`)}
              >
                <TableCell className="px-4 text-sm font-medium leading-5">{opp.type}</TableCell>
                <TableCell className="px-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#333333]">
                      <span className="text-xs">ETH</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium leading-5">{opp.vault}</p>
                        {opp.badge && (
                          <Badge className="bg-orange-500/20 text-xs text-orange-500">
                            {opp.badge}
                          </Badge>
                        )}
                      </div>
                      {opp.vaultSubtitle && (
                        <p className="text-xs leading-[15px] text-[#999999]">{opp.vaultSubtitle}</p>
                      )}
                    </div>
                  </div>
                </TableCell>

                {/* Dynamic columns based on opportunity type */}
                {opp.type === 'Fixed Yield' ? (
                  <>
                    <TableCell className="px-4 text-sm font-medium leading-5">
                      {opp.fixedApy}%
                    </TableCell>
                    <TableCell className="px-4 text-sm leading-5 text-[#999999]">
                      {opp.liquidity}
                    </TableCell>
                  </>
                ) : (
                  <>
                    <TableCell className="px-4 text-sm font-medium leading-5">{opp.apy}%</TableCell>
                    <TableCell className="px-4 text-[#666666]">-</TableCell>
                    <TableCell className="px-4 text-[#666666]">-</TableCell>
                  </>
                )}

                <TableCell className="px-4">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1E88E5]">
                      <span className="text-xs">A</span>
                    </div>
                    <span className="text-sm leading-5">{opp.network}</span>
                  </div>
                </TableCell>
                <TableCell className="px-4">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#333333]">
                      <span className="text-xs">{opp.protocol.charAt(0)}</span>
                    </div>
                    <span className="text-sm leading-5">{opp.protocol}</span>
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
    </div>
  );
}

export default function OpportunitiesPage() {
  const opportunities = mockOpportunities;

  const lendOpportunities = opportunities.filter((o) => o.type === 'Lend');
  const liquidStakingOpportunities = opportunities.filter((o) => o.type === 'Liquid Staking');
  const fixedYieldOpportunities = opportunities.filter((o) => o.type === 'Fixed Yield');

  return (
    <div className="space-y-12">
      {/* Lend Opportunities */}
      <OpportunitiesGroup
        title="Lend"
        opportunities={lendOpportunities}
        columns={['APY', 'Deposited', 'Earnings']}
      />

      {/* Liquid Staking Opportunities */}
      <OpportunitiesGroup
        title="Liquid Staking"
        opportunities={liquidStakingOpportunities}
        columns={['APY', 'Deposited', 'Earnings']}
      />

      {/* Fixed Yield Opportunities */}
      <OpportunitiesGroup
        title="Fixed Yield"
        opportunities={fixedYieldOpportunities}
        columns={['Fixed APY', 'Liquidity']}
      />
    </div>
  );
}
