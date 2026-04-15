'use client';

import { CurrencyDollarIcon, LockClosedIcon, SparklesIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';

import { isEarnEnabled } from '@/bridge/util/featureFlag';
import { Card } from '@/components/Card';

const features = [
  { icon: LockClosedIcon, label: 'Top-tier Protocol Protection' },
  { icon: SparklesIcon, label: 'Daily Rewards' },
  { icon: CurrencyDollarIcon, label: 'Instant Liquidity' },
];

export function EarnBanner() {
  if (!isEarnEnabled()) {
    return null;
  }

  return (
    <Card
      cardType="link"
      href="/earn"
      className="relative flex h-[200px] items-center overflow-hidden bg-dark p-6 lg:h-[282px] lg:p-14 group hover:bg-dark"
      analyticsProps={{
        eventName: 'Homepage Earn Banner Click',
      }}
    >
      {/* Background gradient image - blurred so edges fade, shifted right */}
      <Image
        src="/images/EarnBannerGradient.svg"
        alt=""
        width={1153}
        height={200}
        className="pointer-events-none absolute bottom-0 left-[30%] top-0 h-full w-auto object-cover blur-[15px] group-hover:opacity-50 transition-opacity duration-300 opacity-100"
        aria-hidden
      />

      {/* Left content */}
      <div className="z-10 flex flex-col gap-3 lg:max-w-[520px] lg:gap-4">
        <h2 className="text-xl leading-tight tracking-tight lg:text-[28px]">
          Maximize earnings with Arbitrum Earn
        </h2>
        <p className="text-sm leading-relaxed opacity-50 lg:text-lg">
          Explore earn opportunities with liquid staking, lending, and fixed yield products
        </p>
        <div className="flex flex-wrap items-center gap-3 lg:gap-4">
          {features.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-1">
              <Icon className="size-4 text-primary-cta lg:size-5" />
              <span className="text-xs lg:text-sm">{label}</span>
            </div>
          ))}
        </div>
        <span className="mt-1 inline-flex w-max rounded border border-dark bg-primary-cta px-4 py-2.5 text-sm font-medium text-white">
          Explore opportunities
        </span>
      </div>

      {/* Shadow card */}
      <div className="absolute right-[45px] hidden h-[300px] w-[400px] group-hover:bg-black/60 group-hover:right-[30px] rounded-[23px] group-hover:bottom-[-100px] transition-all duration-300 border border-white/10 bg-black/20 lg:block rotate-[6deg] bottom-[-120px] z-10 blur-[3px] group-hover:blur-[8px]" />

      {/* Front card: actual SVG, overlaps back card */}
      <Image
        src="/images/EarnBannerCard.svg"
        alt=""
        width={450}
        height={300}
        className="pointer-events-none absolute bottom-[-16px] right-[20px] hidden lg:block z-20 group-hover:bottom-0 duration-300 transition-all"
        aria-hidden
      />
    </Card>
  );
}
