import { ChartBarIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import Link from 'next/link';

import { Tooltip } from '@/app-components/Tooltip';
import { CATEGORY_INDICATOR_CLASS, OpportunityTableRow } from '@/app-types/earn/vaults';
import { SafeImage } from '@/bridge/components/common/SafeImage';
import { formatUSD } from '@/bridge/util/NumberUtils';

interface OpportunityRowProps {
  opportunity: OpportunityTableRow;
}

export function OpportunityRow({ opportunity }: OpportunityRowProps) {
  const categoryClass = CATEGORY_INDICATOR_CLASS[opportunity.category] ?? 'bg-gray-1';

  return (
    <Link
      href={`/earn/opportunity/${opportunity.category}/${opportunity.id}`}
      className="group bg-neutral-50 rounded h-[66px] px-4 py-3 flex gap-4 items-center hover:bg-default-black-hover transition-colors w-full text-left border-0"
    >
      <div className="w-[150px] shrink-0">
        <div className="flex items-center gap-2.5">
          <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${categoryClass}`} />
          <div className="flex flex-col gap-0.5">
            <p className="text-sm text-white leading-[1.15] tracking-[-0.28px]">
              {opportunity.name}
            </p>
            {opportunity.maturityDate && (
              <p className="text-xs text-white opacity-50 leading-none">
                {opportunity.maturityDate}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="w-[146px] shrink-0 flex items-center gap-2">
        <SafeImage
          src={opportunity.tokenIcon}
          alt={opportunity.token}
          width={24}
          height={24}
          className="rounded-full shrink-0"
        />
        <div className="flex flex-col gap-0.5">
          <p className="text-sm text-white leading-[1.15] tracking-[-0.28px] whitespace-nowrap">
            {opportunity.token}
          </p>
          {opportunity.tokenNetwork && (
            <div className="flex items-center gap-1.5">
              <SafeImage
                src="/images/ArbitrumLogo.svg"
                alt={opportunity.tokenNetwork}
                width={12}
                height={12}
                className="shrink-0"
              />
              <p className="text-xs text-white opacity-50 leading-none whitespace-nowrap">
                {opportunity.tokenNetwork.toLowerCase() === 'arbitrum'
                  ? 'Arbitrum One'
                  : opportunity.tokenNetwork}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex items-center gap-1 min-w-0">
        <p className="text-sm text-white leading-[1.15] tracking-[-0.28px] w-[45px]">
          {opportunity.apy}
        </p>
        {opportunity.apyBreakdown && opportunity.apyBreakdown.reward > 0 && (
          <Tooltip
            content={
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-1.5">
                    <ChartBarIcon className="h-3.5 w-3.5 text-white opacity-70" />
                    <span className="text-xs text-white opacity-70">Base APY</span>
                  </div>
                  <span className="text-xs text-white font-medium">
                    {opportunity.apyBreakdown.base.toFixed(2)}%
                  </span>
                </div>
                {opportunity.apyBreakdown.reward > 0 && (
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-1.5">
                      <Image
                        src="/images/sparkles.svg"
                        alt="Sparkles"
                        width={16}
                        height={16}
                        aria-hidden
                      />
                      <span className="text-xs text-white opacity-70">Rewards</span>
                    </div>
                    <span className="text-xs font-medium bg-gradient-to-r from-primary-cta to-earn-success bg-clip-text text-transparent">
                      {opportunity.apyBreakdown.reward.toFixed(2)}%
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between gap-4 pt-1 border-t border-white/10">
                  <span className="text-xs text-white font-medium">Total APY</span>
                  <span className="text-xs text-white font-medium">
                    {opportunity.apyBreakdown.total.toFixed(2)}%
                  </span>
                </div>
              </div>
            }
            side="top"
          >
            <div className="w-6 h-6 shrink-0 flex items-center justify-center cursor-pointer hover:bg-white/5 rounded p-0.5">
              <Image src="/images/sparkles.svg" alt="Sparkles" width={24} height={24} aria-hidden />
            </div>
          </Tooltip>
        )}
      </div>

      <div className="flex-1 flex flex-col gap-0.5 min-w-0">
        {opportunity.deposited != null ? (
          <>
            <p className="text-sm text-white leading-[1.15] tracking-[-0.28px]">
              {opportunity.deposited}
            </p>
            {opportunity.depositedUsd != null && (
              <p className="text-xs text-white opacity-50 leading-none">
                {formatUSD(opportunity.depositedUsd)}
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-gray-5">-</p>
        )}
      </div>

      <div className="flex-1 flex items-center min-w-0">
        {opportunity.projectedEarningsUsd != null ? (
          <p className="text-sm text-white leading-[1.15] tracking-[-0.28px]">
            {formatUSD(opportunity.projectedEarningsUsd)}
          </p>
        ) : (
          <p className="text-sm text-gray-5">-</p>
        )}
      </div>

      <div className="w-[116px] shrink-0 flex items-center gap-2">
        <p className="text-sm text-white leading-[1.15] tracking-[-0.28px] whitespace-nowrap">
          {opportunity.tvl}
        </p>
      </div>

      <div className="flex-1 flex items-center gap-2 min-w-0">
        <SafeImage
          src={opportunity.protocolIcon}
          alt={opportunity.protocol}
          width={24}
          height={24}
          className="shrink-0 object-contain rounded"
        />
        <p className="text-sm text-white leading-[1.15] tracking-[-0.28px] whitespace-nowrap capitalize">
          {opportunity.protocol}
        </p>
      </div>

      <div className="bg-white/10 rounded p-2 flex items-center justify-center group-hover:bg-white/20 shrink-0">
        <ChevronRightIcon className="h-4 w-4 text-white" />
      </div>
    </Link>
  );
}
