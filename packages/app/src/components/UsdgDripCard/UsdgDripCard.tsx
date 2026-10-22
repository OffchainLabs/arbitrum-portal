'use client';

import { ArrowTopRightOnSquareIcon, XMarkIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import { twMerge } from 'tailwind-merge';
import { useShallow } from 'zustand/react/shallow';

import { ExternalLink } from '@/bridge/components/common/ExternalLink';
import { useSiteBannerVisible } from '@/bridge/components/common/SiteBanner';
import { useMode } from '@/bridge/hooks/useMode';
import { ChainId } from '@/bridge/types/ChainId';
import { trackEvent } from '@/bridge/util/AnalyticsUtils';
import { getBridgeUiConfigForChain } from '@/bridge/util/bridgeUiConfig';

import { useUsdgDripCardStore } from './useUsdgDripCard';

export function UsdgDripCard() {
  const { isOpen, dismiss } = useUsdgDripCardStore(
    useShallow((state) => ({ isOpen: state.isOpen, dismiss: state.dismiss })),
  );
  const isBannerVisible = useSiteBannerVisible();
  const { embedMode } = useMode();
  const { color } = getBridgeUiConfigForChain(ChainId.RobinhoodChain);

  if (!isOpen) {
    return null;
  }

  const onDismiss = () => {
    trackEvent('USDG DRIP Card', { action: 'dismissed' });
    dismiss();
  };

  return (
    <aside
      aria-label="USDG DRIP rewards"
      style={{ borderColor: color }}
      className={twMerge(
        // opaque so the card stays readable where it overlaps the panel on narrow screens
        'fixed z-40 flex flex-col items-start gap-4 rounded border bg-robinhood-dark p-4 text-white',
        'motion-safe:animate-slide-in-right',
        embedMode
          ? // the widget has no app shell to anchor to, so it keeps the mobile layout at every
            // width, with nothing to clear at the bottom edge
            'inset-x-4 bottom-4'
          : [
              'inset-x-4 bottom-[calc(var(--navbar-mobileBottom)+16px)]',
              'md:inset-x-auto md:bottom-auto md:right-0 md:w-[360px] md:rounded-r-none md:border-r-0',
              'md:top-[calc(var(--navbar-desktop)+(var(--navbar-spacing)))]',
              isBannerVisible &&
                'md:top-[calc(var(--navbar-desktop)+(var(--navbar-bannerDesktop))+(var(--navbar-spacing)))]',
            ],
      )}
    >
      <span style={{ color }} className="rounded-sm bg-black px-2 py-0.5 text-xs">
        DRIP program
      </span>
      <div className="flex w-full items-start gap-[5px]">
        <Image
          src="/images/usdg-logo.png"
          alt="USDG logo"
          width={30}
          height={30}
          className="h-[30px] w-[30px] shrink-0"
        />
        <p className="min-w-0 flex-1 self-center text-base tracking-[-0.32px]">
          Earn incentivized rewards with your USDG
        </p>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss USDG DRIP rewards"
          className="arb-hover shrink-0"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>
      <p className="text-xs tracking-[-0.24px] text-white/80">
        Supply USDG to Morpho or GMX vaults and earn up to 8% APR.
      </p>
      <ExternalLink
        href="https://arbitrumdrip.com/opportunities"
        onClick={() => trackEvent('USDG DRIP Card', { action: 'learn_more_clicked' })}
        className="arb-hover flex items-center gap-2 rounded bg-black px-[10px] py-[5px] text-sm leading-[1.35] tracking-[-0.28px] text-white"
      >
        Learn More
        <ArrowTopRightOnSquareIcon className="h-4 w-4" />
      </ExternalLink>
    </aside>
  );
}
