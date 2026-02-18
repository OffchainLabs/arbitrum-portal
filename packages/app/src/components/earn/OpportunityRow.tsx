'use client';

import { ChartBarIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { SparklesIcon } from '@heroicons/react/24/solid';
import { useRouter } from 'next/navigation';

import { OpportunityTableRow } from '@/app-types/earn/vaults';
import { SafeImage } from '@/bridge/components/common/SafeImage';
import { Tooltip } from '@/bridge/components/common/Tooltip';
import { formatUSD } from '@/bridge/util/NumberUtils';

interface OpportunityRowProps {
  opportunity: OpportunityTableRow;
}

// Type colors matching Figma design
const typeColors: Record<string, string> = {
  lend: '#4970e9',
};

// Reusable gradient SparklesIcon component
interface GradientSparklesIconProps {
  size?: number;
  className?: string;
}

function GradientSparklesIcon({ size = 4, className = '' }: GradientSparklesIconProps) {
  const sizePx = `${size * 4}px`; // Convert Tailwind size (3.5 = 14px, 5 = 20px)
  const sparklesMaskUrl =
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='black' d='M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z'/%3E%3C/svg%3E\") no-repeat center/contain";

  return (
    <div className={`relative ${className}`} style={{ width: sizePx, height: sizePx }}>
      <div
        className="absolute inset-0 bg-gradient-to-r from-[#325ee6] to-[#96d18e]"
        style={{
          mask: sparklesMaskUrl,
          WebkitMask: sparklesMaskUrl,
        }}
      />
      <SparklesIcon
        className="absolute inset-0 text-transparent pointer-events-none"
        style={{ width: sizePx, height: sizePx }}
        aria-hidden="true"
      />
    </div>
  );
}

export function OpportunityRow({ opportunity }: OpportunityRowProps) {
  const router = useRouter();

  const handleRowClick = () => {
    router.push(`/earn/opportunity/${opportunity.category}/${opportunity.id}`);
  };

  const categoryColor = typeColors[opportunity.category] || '#191919';

  // Convert hex to rgba for border color with 10% opacity
  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  return (
    <div
      onClick={handleRowClick}
      className="group cursor-pointer bg-neutral-50 rounded h-[66px] px-4 py-3 flex gap-4 items-center hover:bg-default-black-hover transition-colors"
    >
      {/* Name with Category Color Indicator */}
      <div className="w-[150px] shrink-0">
        <div className="flex items-center gap-2.5">
          {/* Category color indicator */}
          <div
            className="w-2.5 h-2.5 rounded border-2 shrink-0"
            style={{
              backgroundColor: categoryColor,
              borderColor: hexToRgba(categoryColor, 0.1), // 10% opacity
            }}
          />
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

      {/* Token */}
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

      {/* APY */}
      <div className="flex-1 flex items-center gap-1 min-w-0">
        <p className="text-sm text-white leading-[1.15] tracking-[-0.28px] w-[45px]">
          {opportunity.apy}
        </p>
        {opportunity.apyBreakdown && opportunity.apyBreakdown.reward > 0 && (
          <Tooltip
            content={
              <div className="flex flex-col gap-2 p-2 bg-neutral-100 rounded">
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
                        <GradientSparklesIcon size={4} />
                        <span className="text-xs text-white opacity-70">Rewards</span>
                      </div>
                      <span className="text-xs font-medium bg-gradient-to-r from-[#325ee6] to-[#96d18e] bg-clip-text text-transparent">
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
            <div className="w-6 h-6 shrink-0 flex items-center justify-center cursor-pointer hover:bg-white/5 rounded-full">
              <GradientSparklesIcon size={6} />
            </div>
          </Tooltip>
        )}
      </div>

      {/* Your Holdings */}
      <div className="flex-1 flex flex-col gap-0.5 min-w-0">
        {opportunity.deposited !== '-' ? (
          <>
            <p className="text-sm text-white leading-[1.15] tracking-[-0.28px]">
              {opportunity.deposited}
            </p>
            {opportunity.depositedUsd !== '-' && (
              <p className="text-xs text-white opacity-50 leading-none">
                {(() => {
                  // Parse and format USD value to ensure consistent formatting
                  const usdValue = opportunity.depositedUsd.replace(/[$,]/g, '');
                  const numValue = parseFloat(usdValue);
                  return isNaN(numValue) ? opportunity.depositedUsd : formatUSD(numValue);
                })()}
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-gray-5">-</p>
        )}
      </div>

      <div className="flex-1 flex items-center min-w-0">
        {opportunity.earningsUsd !== '-' && opportunity.earningsUsd ? (
          <p className="text-sm text-white leading-[1.15] tracking-[-0.28px]">
            {(() => {
              const usdValue = opportunity.earningsUsd.replace(/[$,]/g, '');
              const numValue = parseFloat(usdValue);
              return isNaN(numValue) ? opportunity.earningsUsd : formatUSD(numValue);
            })()}
          </p>
        ) : (
          <p className="text-sm text-gray-5">-</p>
        )}
      </div>

      {/* TVL */}
      <div className="w-[116px] shrink-0 flex items-center gap-2">
        <p className="text-sm text-white leading-[1.15] tracking-[-0.28px] whitespace-nowrap">
          {opportunity.tvl}
        </p>
      </div>

      {/* Protocol */}
      <div className="flex-1 flex items-center gap-2 min-w-0">
        <SafeImage
          src={opportunity.protocolIcon}
          alt={opportunity.protocol}
          width={24}
          height={24}
          className="shrink-0 object-contain rounded"
          style={{ objectFit: 'contain' }}
        />
        <p className="text-sm text-white leading-[1.15] tracking-[-0.28px] whitespace-nowrap capitalize">
          {opportunity.protocol}
        </p>
      </div>

      <div className="bg-white/10 rounded p-2 flex items-center justify-center group-hover:bg-white/20">
        <ChevronRightIcon className="h-4 w-4 text-white " />
      </div>
    </div>
  );
}
