'use client';

import { SparklesIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';

import { OpportunityTableRow } from '@/app-types/earn/vaults';
import { SafeImage } from '@/bridge/components/common/SafeImage';
import { Tooltip } from '@/bridge/components/common/Tooltip';
import { formatUSD } from '@/bridge/util/NumberUtils';

interface OpportunityCardProps {
  opportunity: OpportunityTableRow;
}

// Type colors matching Figma design
const typeColors: Record<string, string> = {
  'lend': '#4970e9',
  'fixed-yield': '#b759e6',
  'liquid-staking': '#f6851b',
};

export function OpportunityCard({ opportunity }: OpportunityCardProps) {
  const router = useRouter();

  const handleCardClick = () => {
    router.push(`/earn/opportunity/${opportunity.category}/${opportunity.id}`);
  };

  // Convert hex to rgba for border color with 10% opacity
  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  // Format USD values
  const formatUsdValue = (usdString: string): string => {
    if (!usdString || usdString === '-') return '-';
    const cleaned = usdString.replace(/[$,]/g, '');
    const numValue = parseFloat(cleaned);
    return isNaN(numValue) ? usdString : formatUSD(numValue);
  };

  const categoryColor = typeColors[opportunity.category] || '#191919';

  return (
    <div
      onClick={handleCardClick}
      className="group cursor-pointer bg-neutral-50 rounded p-4 flex flex-col gap-5 transition-colors hover:bg-default-black-hover"
    >
      <div className="flex items-center gap-2.5">
        <div
          className="w-3 h-3 rounded-[5px] border-2 shrink-0"
          style={{
            backgroundColor: categoryColor,
            borderColor: hexToRgba(categoryColor, 0.1),
          }}
        />
        <p className="text-sm text-white leading-[1.15] tracking-[-0.28px]">{opportunity.name}</p>
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
          />
          <div className="flex flex-col gap-0.5">
            <p className="text-xl text-white leading-[1.15] tracking-[-0.4px]">
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
                <div className="flex flex-col gap-2 p-2 bg-neutral-100 rounded">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs text-white opacity-70">Base APY</span>
                      <span className="text-xs text-white font-medium">
                        {opportunity.apyBreakdown.base.toFixed(2)}%
                      </span>
                    </div>
                    {opportunity.apyBreakdown.reward > 0 && (
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-xs text-white opacity-70">Reward APY</span>
                        <span className="text-xs text-white font-medium">
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
                </div>
              }
              tippyProps={{ placement: 'top' }}
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
                style={{ objectFit: 'contain' }}
              />
              <p className="text-lg text-white leading-[1.35] tracking-[-0.36px]">
                {opportunity.protocol}
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-1">
          <div className="flex-1 bg-neutral-100 rounded p-3 flex flex-col gap-2">
            <p className="text-xs text-white opacity-50 leading-none">Estd. Earnings</p>
            <div className="flex flex-col gap-1">
              {opportunity.earningsUsd !== '-' && opportunity.earningsUsd ? (
                <p className="text-lg text-white leading-[1.35] tracking-[-0.36px]">
                  {formatUsdValue(opportunity.earningsUsd)}
                </p>
              ) : (
                <p className="text-lg text-gray-5 leading-[1.35] tracking-[-0.36px]">-</p>
              )}
            </div>
          </div>

          <div className="flex-1 bg-neutral-100 rounded p-3 flex flex-col gap-2">
            <p className="text-xs text-white opacity-50 leading-none">Your Holdings</p>
            <div className="flex flex-col gap-1">
              {opportunity.deposited !== '-' ? (
                <>
                  <p className="text-lg text-white leading-[1.35] tracking-[-0.36px]">
                    {opportunity.deposited}
                  </p>
                  {opportunity.depositedUsd !== '-' && (
                    <p className="text-xs text-white opacity-50 leading-none">
                      {formatUsdValue(opportunity.depositedUsd)}
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
    </div>
  );
}
