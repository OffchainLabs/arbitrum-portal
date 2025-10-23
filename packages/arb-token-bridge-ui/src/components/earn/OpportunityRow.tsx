'use client';

import { ChevronRightIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';

import { OpportunityTableRow } from '../../types/vaults';
import { SafeImage } from '../common/SafeImage';

interface OpportunityRowProps {
  opportunity: OpportunityTableRow;
  showDepositedEarnings?: boolean; // True for Your Holdings, false for Market
}

export function OpportunityRow({ opportunity, showDepositedEarnings = true }: OpportunityRowProps) {
  const router = useRouter();

  const handleRowClick = () => {
    router.push(`/earn/opportunity/${opportunity.id}`);
  };

  return (
    <tr
      onClick={handleRowClick}
      className="group cursor-pointer hover:bg-default-black-hover transition-colors mb-2 h-[40px] rounded-md overflow-hidden p-2"
    >
      {/* Name */}
      <td className="py-5 pl-6 pr-4">
        <div className="truncate text-[15px] font-medium text-white">{opportunity.name}</div>
      </td>

      {/* Token */}
      <td className="py-5 pr-4">
        <div className="flex items-center gap-3">
          <SafeImage
            src={opportunity.tokenIcon}
            alt={opportunity.token}
            width={20}
            height={20}
            className="rounded-full"
          />

          <div className="truncate text-[15px] font-medium text-white">{opportunity.token}</div>
        </div>
      </td>

      {/* APY */}
      <td className="py-5 pr-4">
        <div className="flex items-center gap-1">
          <span className="text-[15px] font-medium text-white">{opportunity.apy}</span>
        </div>
      </td>

      {/* Deposited */}
      <td className="py-5 pr-4">
        {showDepositedEarnings ? (
          <div>
            <div className="truncate text-[15px] font-medium text-white">
              {opportunity.deposited}
            </div>
            <div className="truncate text-xs text-gray-500">{opportunity.depositedUsd}</div>
          </div>
        ) : (
          <div className="text-[15px] text-gray-600">-</div>
        )}
      </td>

      {/* Earnings */}
      <td className="py-5 pr-4">
        {showDepositedEarnings && opportunity.earnings !== '-' ? (
          <div>
            <div className="text-[15px] font-medium text-white">{opportunity.earnings}</div>
            {opportunity.earningsUsd !== '-' && (
              <div className="truncate text-xs text-gray-500">{opportunity.earningsUsd}</div>
            )}
          </div>
        ) : (
          <div className="text-[15px] text-gray-600">-</div>
        )}
      </td>

      {/* TVL */}
      <td className="py-5 pr-4">
        <div className="truncate text-[15px] font-medium text-white">{opportunity.tvl}</div>
      </td>

      {/* Protocol */}
      <td className="py-5 pr-4">
        <div className="flex items-center gap-2">
          <SafeImage
            src={opportunity.protocolIcon}
            alt={opportunity.protocol}
            width={20}
            height={20}
            className="rounded-full"
          />

          <div className="truncate text-[15px] font-medium text-white">{opportunity.protocol}</div>
        </div>
      </td>

      {/* Arrow */}
      <td className="py-5 pr-6">
        <ChevronRightIcon className="h-5 w-5 text-white transition-colors group-hover:text-gray-400" />
      </td>
    </tr>
  );
}
