'use client';

import { OpportunityTableRow } from 'arb-token-bridge-ui/src/types/vaults';

import { OpportunityRow } from './OpportunityRow';

interface PositionsTableProps {
  positions: OpportunityTableRow[];
}

export function PositionsTable({ positions }: PositionsTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg bg-gray-900/50">
      <table className="w-full table-fixed">
        <thead>
          <tr className="border-b border-gray-800 text-left text-xs uppercase tracking-wider text-gray-500">
            <th className="w-[15%] py-4 pl-6 pr-4 font-medium">Name</th>
            <th className="w-[18%] py-4 pr-4 font-medium">Token</th>
            <th className="w-[12%] py-4 pr-4 font-medium">APY</th>
            <th className="w-[15%] py-4 pr-4 font-medium">Deposited</th>
            <th className="w-[12%] py-4 pr-4 font-medium">Earnings</th>
            <th className="w-[13%] py-4 pr-4 font-medium">TVL</th>
            <th className="w-[13%] py-4 pr-4 font-medium">Protocol</th>
            <th className="w-[2%] py-4 pr-6"></th>
          </tr>
        </thead>
        <tbody>
          {positions.map((opportunity) => (
            <OpportunityRow
              key={opportunity.id}
              opportunity={opportunity}
              showDepositedEarnings={true}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
