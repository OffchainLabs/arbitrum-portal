import { ChartBarIcon, SparklesIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import Link from 'next/link';

import { Tooltip } from '@/app-components/Tooltip';
import {
  CATEGORY_INDICATOR_CLASS,
  type OpportunitySelectHandler,
  OpportunityTableRow,
} from '@/app-types/earn/vaults';
import { SafeImage } from '@/bridge/components/common/SafeImage';
import { ARBITRUM_LOGO } from '@/bridge/constants';
import { formatPercentage, formatUSD } from '@/bridge/util/NumberUtils';

interface OpportunityCardProps {
  opportunity: OpportunityTableRow;
  onOpportunitySelect?: OpportunitySelectHandler;
}

export function OpportunityCard({ opportunity, onOpportunitySelect }: OpportunityCardProps) {
  const categoryClass = CATEGORY_INDICATOR_CLASS[opportunity.category] ?? 'bg-gray-1';
  const isExpired =
    opportunity.rawMaturityDate != null && new Date(opportunity.rawMaturityDate) < new Date();

  return (
    <Link
      href={`/earn/opportunity/${opportunity.category}/${opportunity.id}`}
      onClick={() => onOpportunitySelect?.(opportunity, 'table-card')}
      className="group bg-neutral-50 rounded p-4 flex flex-col gap-5 transition-colors hover:bg-default-black-hover no-underline"
    >
      <div className="flex items-center gap-2.5">
        <div className={`w-3 h-3 rounded-full shrink-0 ${categoryClass}`} />
        <div className="flex flex-col gap-0.5">
          <p className="text-sm text-white leading-[1.15] tracking-[-0.28px]">{opportunity.name}</p>
          {isExpired && (
            <Tooltip
              content={
                <p className="text-xs text-white">
                  {opportunity.maturityDate
                    ? `Matured on ${opportunity.maturityDate}`
                    : 'This position has matured'}
                </p>
              }
              tippyProps={{ placement: 'top' }}
            >
              <span className="text-[10px] font-medium leading-none text-amber-400 bg-amber-400/15 rounded px-1.5 py-0.5 cursor-default self-start">
                Matured
              </span>
            </Tooltip>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2.5">
        {/* Token Info */}
        <div className="flex items-center gap-2">
          <SafeImage
            src={opportunity.tokenIcon}
            alt={opportunity.token}
            width={24}
            height={24}
            className="rounded-full shrink-0"
            fallback={<div className="size-6 rounded-full bg-white/10 shrink-0" />}
          />
          <div className="flex flex-col gap-0.5">
            <p className="text-xl text-white leading-[1.15] tracking-[-0.4px]">
              {opportunity.token}
            </p>
            {opportunity.tokenNetwork && (
              <div className="flex items-center gap-1.5">
                <SafeImage
                  src={ARBITRUM_LOGO}
                  alt={opportunity.tokenNetwork}
                  width={12}
                  height={12}
                  className="shrink-0"
                />
                <p className="text-xs text-white opacity-50 leading-none">
                  {opportunity.tokenNetwork}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* APY */}
        <div className="flex items-center gap-2">
          <p className="text-xl text-white leading-[1.15] tracking-[-0.4px]">{opportunity.apy}</p>
          <p className="text-xl text-white leading-[1.15] tracking-[-0.4px]">APY</p>
          {opportunity.apyBreakdown && opportunity.apyBreakdown.reward > 0 && (
            <Tooltip
              content={
                <div className="flex flex-col min-w-[173px]">
                  <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg">
                    <div className="flex items-center gap-2">
                      <ChartBarIcon className="h-4 w-4 text-white opacity-50" />
                      <span className="text-sm font-medium text-white opacity-50">Base APY</span>
                    </div>
                    <span className="ml-auto text-sm font-medium text-white">
                      {formatPercentage(opportunity.apyBreakdown.base)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Image
                        src="/images/sparkles.svg"
                        alt="Sparkles"
                        width={16}
                        height={16}
                        aria-hidden
                      />
                      <span className="text-sm font-medium bg-gradient-to-b from-bright-blue to-electric-blue bg-clip-text text-transparent">
                        Rewards
                      </span>
                    </div>
                    <span className="ml-auto text-sm font-medium bg-gradient-to-b from-bright-blue to-electric-blue bg-clip-text text-transparent">
                      {formatPercentage(opportunity.apyBreakdown.reward)}
                    </span>
                  </div>
                </div>
              }
              tippyProps={{
                placement: 'top',
              }}
            >
              <div className="w-5 h-5 shrink-0 flex items-center justify-center cursor-pointer hover:bg-white/5 rounded-full">
                <SparklesIcon className="h-5 w-5 text-white opacity-50" />
              </div>
            </Tooltip>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex gap-1">
          <div className="flex-1 bg-neutral-100 rounded p-3 flex flex-col gap-2 h-[78px]">
            <p className="text-xs text-white opacity-50 leading-none">TVL</p>
            <p className="text-lg text-white leading-[1.35] tracking-[-0.36px]">
              {opportunity.tvl}
            </p>
          </div>

          <div className="flex-1 bg-neutral-100 rounded p-3 flex flex-col gap-2 h-[78px]">
            <p className="text-xs text-white opacity-50 leading-none">Protocol</p>
            <div className="flex items-center gap-2">
              <SafeImage
                src={opportunity.protocolIcon}
                alt={opportunity.protocol}
                width={24}
                height={24}
                className="shrink-0 object-contain"
                fallback={<div className="size-6 rounded-full bg-white/10 shrink-0" />}
              />
              <p className="text-lg text-white leading-[1.35] tracking-[-0.36px]">
                {opportunity.protocol}
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-1">
          <div className="flex-1 bg-neutral-100 rounded p-3 flex flex-col gap-2">
            <p className="text-xs text-white opacity-50 leading-none">Projected Earnings</p>
            <div className="flex flex-col gap-1">
              {opportunity.projectedEarningsUsd != null ? (
                <p className="text-lg text-white leading-[1.35] tracking-[-0.36px]">
                  {formatUSD(opportunity.projectedEarningsUsd)}
                </p>
              ) : (
                <p className="text-lg text-gray-5 leading-[1.35] tracking-[-0.36px]">-</p>
              )}
            </div>
          </div>

          <div className="flex-1 bg-neutral-100 rounded p-3 flex flex-col gap-2">
            <p className="text-xs text-white opacity-50 leading-none">Your Holdings</p>
            <div className="flex flex-col gap-1">
              {opportunity.deposited != null ? (
                <>
                  <p className="text-lg text-white leading-[1.35] tracking-[-0.36px]">
                    {opportunity.deposited}
                  </p>
                  {opportunity.depositedUsd != null && (
                    <p className="text-xs text-white opacity-50 leading-none">
                      {formatUSD(opportunity.depositedUsd)}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-lg text-gray-5 leading-[1.35] tracking-[-0.36px]">-</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
