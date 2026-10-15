'use client';

import { ArrowTopRightOnSquareIcon, XMarkIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import { twMerge } from 'tailwind-merge';

import { ExternalLink } from '@/bridge/components/common/ExternalLink';
import { useSiteBannerVisible } from '@/bridge/components/common/SiteBanner';
import { trackEvent } from '@/bridge/util/AnalyticsUtils';

import { useUsdgDripCardStore } from './useUsdgDripCardStore';

export const DRIP_OPPORTUNITIES_URL = 'https://arbitrumdrip.com/opportunities';

export function UsdgDripCard() {
  const isOpen = useUsdgDripCardStore((state) => state.isOpen);
  const dismiss = useUsdgDripCardStore((state) => state.dismiss);
  const isBannerVisible = useSiteBannerVisible();

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
      className={twMerge(
        // #293300 is Robinhood's #CCFF00 accent at 20% over the black page, made opaque so the
        // card stays readable where it overlaps the panel on narrow screens.
        'fixed z-40 flex flex-col items-start gap-[15px] rounded border border-[#CCFF00] bg-[#293300] p-[15px] text-white',
        'inset-x-4 bottom-[calc(theme(navbar.mobileBottom)+16px)]',
        'md:inset-x-auto md:bottom-auto md:right-0 md:w-[360px] md:rounded-r-none md:border-r-0',
        'md:top-[calc(theme(navbar.desktop)+theme(navbar.spacing))]',
        isBannerVisible &&
          'md:top-[calc(theme(navbar.desktop)+theme(navbar.bannerDesktop)+theme(navbar.spacing))]',
        'motion-safe:animate-slide-in-right',
      )}
    >
      <span className="rounded-[5px] bg-black px-2 py-0.5 text-xs text-[#CCFF00]">
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
        href={DRIP_OPPORTUNITIES_URL}
        onClick={() => trackEvent('USDG DRIP Card', { action: 'learn_more_clicked' })}
        className="arb-hover flex items-center gap-2 rounded bg-black px-[10px] py-[5px] text-sm leading-[1.35] tracking-[-0.28px] text-white"
      >
        Learn More
        <ArrowTopRightOnSquareIcon className="h-4 w-4" />
      </ExternalLink>
    </aside>
  );
}
