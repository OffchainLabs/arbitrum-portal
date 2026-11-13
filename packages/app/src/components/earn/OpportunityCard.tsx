import { ChartBarIcon, SparklesIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import Link from 'next/link';

import {
  CATEGORY_INDICATOR_CLASS,
  type OpportunitySelectHandler,
  OpportunityTableRow,
} from '@/app-types/earn/vaults';
import { Tooltip } from '@/app/components/common/Tooltip';
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
      className="group flex flex-col gap-5 rounded bg-neutral-50 p-4 no-underline transition-colors hover:bg-default-black-hover"
    >
      <div className="flex items-center gap-2.5">
        <div className={`h-3 w-3 shrink-0 rounded-full ${categoryClass}`} />
        <div className="flex flex-col gap-0.5">
          <p className="text-sm leading-[1.15] tracking-[-0.28px] text-white">{opportunity.name}</p>
          {isExpired && (
            <Tooltip
              content={
                <p className="text-xs text-white">
                  {opportunity.maturityDate
                    ? `Matured on ${opportunity.maturityDate}`
                    : 'This position has matured'}
                </p>
              }
              contentProps={{ side: 'top' }}
            >
              <span className="cursor-default self-start rounded bg-amber-400/15 px-1.5 py-0.5 text-[10px] leading-none font-medium text-amber-400">
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
            className="shrink-0 rounded-full"
            fallback={<div className="size-6 shrink-0 rounded-full bg-white/10" />}
          />
          <div className="flex flex-col gap-0.5">
            <p className="text-xl leading-[1.15] tracking-[-0.4px] text-white">
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
                <p className="text-xs leading-none text-white opacity-50">
                  {opportunity.tokenNetwork}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* APY */}
        <div className="flex items-center gap-2">
          <p className="text-xl leading-[1.15] tracking-[-0.4px] text-white">{opportunity.apy}</p>
          <p className="text-xl leading-[1.15] tracking-[-0.4px] text-white">APY</p>
          {opportunity.apyBreakdown && opportunity.apyBreakdown.reward > 0 && (
            <Tooltip
              as="div"
              content={
                <div className="flex min-w-[173px] flex-col">
                  <div className="flex items-center gap-2.5 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <ChartBarIcon className="h-4 w-4 text-white opacity-50" />
                      <span className="text-sm font-medium text-white opacity-50">Base APY</span>
                    </div>
                    <span className="ml-auto text-sm font-medium text-white">
                      {formatPercentage(opportunity.apyBreakdown.base)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Image
                        src="/images/sparkles.svg"
                        alt="Sparkles"
                        width={16}
                        height={16}
                        aria-hidden
                      />
                      <span className="bg-linear-to-b from-bright-blue to-electric-blue bg-clip-text text-sm font-medium text-transparent">
                        Rewards
                      </span>
                    </div>
                    <span className="ml-auto bg-linear-to-b from-bright-blue to-electric-blue bg-clip-text text-sm font-medium text-transparent">
                      {formatPercentage(opportunity.apyBreakdown.reward)}
                    </span>
                  </div>
                </div>
              }
              contentProps={{ side: 'top' }}
            >
              <div className="flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-full hover:bg-white/5">
                <SparklesIcon className="h-5 w-5 text-white opacity-50" />
              </div>
            </Tooltip>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex gap-1">
          <div className="flex h-[78px] flex-1 flex-col gap-2 rounded bg-neutral-100 p-3">
            <p className="text-xs leading-none text-white opacity-50">TVL</p>
            <p className="text-lg leading-[1.35] tracking-[-0.36px] text-white">
              {opportunity.tvl}
            </p>
          </div>

          <div className="flex h-[78px] flex-1 flex-col gap-2 rounded bg-neutral-100 p-3">
            <p className="text-xs leading-none text-white opacity-50">Protocol</p>
            <div className="flex items-center gap-2">
              <SafeImage
                src={opportunity.protocolIcon}
                alt={opportunity.protocol}
                width={24}
                height={24}
                className="shrink-0 object-contain"
                fallback={<div className="size-6 shrink-0 rounded-full bg-white/10" />}
              />
              <p className="text-lg leading-[1.35] tracking-[-0.36px] text-white">
                {opportunity.protocol}
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-1">
          <div className="flex flex-1 flex-col gap-2 rounded bg-neutral-100 p-3">
            <p className="text-xs leading-none text-white opacity-50">Projected Earnings</p>
            <div className="flex flex-col gap-1">
              {opportunity.projectedEarningsUsd != null ? (
                <p className="text-lg leading-[1.35] tracking-[-0.36px] text-white">
                  {formatUSD(opportunity.projectedEarningsUsd)}
                </p>
              ) : (
                <p className="text-lg leading-[1.35] tracking-[-0.36px] text-gray-5">-</p>
              )}
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-2 rounded bg-neutral-100 p-3">
            <p className="text-xs leading-none text-white opacity-50">Your Holdings</p>
            <div className="flex flex-col gap-1">
              {opportunity.deposited != null ? (
                <>
                  <p className="text-lg leading-[1.35] tracking-[-0.36px] text-white">
                    {opportunity.deposited}
                  </p>
                  {opportunity.depositedUsd != null && (
                    <p className="text-xs leading-none text-white opacity-50">
                      {formatUSD(opportunity.depositedUsd)}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-lg leading-[1.35] tracking-[-0.36px] text-gray-5">-</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
