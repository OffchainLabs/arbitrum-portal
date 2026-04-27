'use client';

import { SparklesIcon } from '@heroicons/react/24/solid';
import { twMerge } from 'tailwind-merge';

import { isEarnEnabled } from '@/bridge/util/featureFlag';
import { Card } from '@/components/Card';

const ARBITRUM_STRIPE_PATHS = [
  'M1127.83 -899.985L1078.63 -1016.77L540.815 553.942L-681.57 31.322L-637.264 135.165L539.676 568.559L1127.83 -899.964V-899.985Z',
  'M538.536 584.339L-592.514 239.917L-547.956 344.31L537.029 604.033L1224.65 -670.364L1176.75 -784.043L538.536 584.339Z',
  'M-503.438 448.637L-456.543 558.509L534.036 642.615L1314.82 -456.291L1273.76 -553.746L535.774 619.812C302.866 581.249 -503.438 448.637 -503.438 448.637Z',
  'M1371.67 -321.311L532.323 664.678L-416.673 652.579L-370.841 760.144L530.507 688.053L1419.94 -206.764L1371.67 -321.311Z',
  'M1468.35 -91.8551L528.823 710.161L-326.809 862.594L-282.464 966.5L526.331 742.335L1519.03 28.4238L1468.33 -91.8975L1468.35 -91.8551Z',
  'M-237.269 1069.94C-225.873 1097.33 -193.464 1171.84 -193.464 1171.84L521.058 811.211L1615.2 256.67L1566.43 141.087L524.033 772.542L-237.211 1069.92L-237.269 1069.96V1069.94Z',
  'M1712.48 487.52C1701.49 461.121 1664.62 372.487 1664.62 372.487L518.122 849.416L-149.661 1278.47L-105.49 1380.94L514.471 897.222L1712.58 487.541L1712.5 487.478L1712.48 487.52Z',
];

function ArbitrumStripes({
  className,
  preserveAspectRatio = 'xMidYMid slice',
}: {
  className?: string;
  preserveAspectRatio?: string;
}) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 1401 760"
      preserveAspectRatio={preserveAspectRatio}
      className={twMerge('pointer-events-none absolute inset-0 size-full fill-arb-navy', className)}
    >
      {ARBITRUM_STRIPE_PATHS.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

function StatTile({
  label,
  value,
  subValue,
  children,
}: {
  label: string;
  value?: string;
  subValue?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-white/[0.08] p-3">
      <span className="text-xs text-white/50">{label}</span>
      {children ?? <span className="text-xl leading-none text-white">{value}</span>}
      {subValue && <span className="text-xs text-white/50">{subValue}</span>}
    </div>
  );
}

function MarketCard() {
  return (
    <div className="pointer-events-none relative -bottom-14 z-10 hidden w-[400px] rotate-[6deg] transition-all duration-300 group-hover:-bottom-10 lg:block shadow-lg">
      <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-black p-4">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-white/10">
              <div className="flex size-8 items-center justify-center rounded-full bg-arb-blue text-sm font-bold text-white">
                $
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xl leading-none text-white">USDC</span>
              <span className="text-xs text-white/50">Arbitrum One</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xl leading-none text-white">3.31%</span>
            <span className="text-xl leading-none text-white/70">APY</span>
            <SparklesIcon className="size-4 text-arb-cyan" />
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-2">
          <StatTile label="TVL" value="$13.3M" />
          <StatTile label="Protocol">
            <div className="flex items-center gap-2">
              <div className="size-6 rounded-full bg-arb-blue" />
              <span className="text-xl leading-none text-white">Morpho</span>
            </div>
          </StatTile>
          <StatTile label="Earnings" value="$2,564" subValue="$4.5 USD" />
          <StatTile label="Deposited" value="0.001 ETH" subValue="$45 USD" />
        </div>
      </div>
    </div>
  );
}

export function EarnBanner() {
  if (!isEarnEnabled()) {
    return null;
  }

  return (
    <Card
      cardType="link"
      href="/earn"
      className="group relative flex h-[200px] items-center overflow-hidden bg-arb-blue-navy p-6 lg:h-[282px] lg:p-14 justify-between"
      analyticsProps={{
        eventName: 'Homepage Earn Banner Click',
      }}
    >
      {/* Mirrored so the convergence sits on the right, behind the card */}
      <ArbitrumStripes className="absolute z-10 inset-0 size-full -scale-x-100 opacity-50 pointer-events-none" />

      {/* Left content */}
      <div className="z-20 flex flex-col gap-3 lg:max-w-[620px] lg:gap-4">
        <h2 className="text-2xl font-bold uppercase leading-tight tracking-tight lg:text-4xl lg:leading-[1.15]">
          <span className="block text-arb-cyan">Start earning today</span>
          <span className="block">on Arbitrum</span>
        </h2>
        <p className="text-sm leading-relaxed lg:text-base lg:max-w-[500px]">
          Stake, lend and access yields across Aave, Morpho, Fluid, Pendle and more – all in one
          place
        </p>
        <span className="mt-1 inline-flex w-max rounded-md bg-white px-10 py-2 text-xs font-medium text-black">
          Start Earning
        </span>
      </div>

      <MarketCard />
    </Card>
  );
}
