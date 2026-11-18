'use client';

import { useCallback, useRef, useState } from 'react';
import Flickity, { FlickityOptions } from 'react-flickity-component';
import { twMerge } from 'tailwind-merge';

import { isEarnEnabled } from '@/bridge/util/featureFlag';

import { EarnBanner } from './EarnBanner';
import { UsdgBanner } from './UsdgBanner';

const carouselOptions: FlickityOptions = {
  draggable: true,
  wrapAround: true,
  autoPlay: 5000,
  pauseAutoPlayOnHover: true,
  prevNextButtons: false,
  pageDots: true,
};

export function HomeBannerCarousel() {
  const [isReady, setIsReady] = useState(false);
  const flickityRef = useRef<Flickity | null>(null);

  const setupFlickityRef = useCallback(
    (carouselRef: Flickity | null) => {
      flickityRef.current = carouselRef;

      if (!flickityRef.current) return;

      flickityRef.current.on('ready', () => {
        if (isReady) return;
        setIsReady(true);
      });
    },
    [setIsReady, isReady],
  );

  // Order matters: the first banner is the first slide / topmost on mobile
  const banners = [
    <UsdgBanner key="usdg" />,
    ...(isEarnEnabled() ? [<EarnBanner key="earn" />] : []),
  ];

  // A single banner needs no carousel (and no lone page dot)
  if (banners.length === 1) {
    return banners[0];
  }

  return (
    <>
      {/* Mobile: stacked vertically */}
      <div className="flex flex-col gap-8 md:hidden">{banners}</div>

      {/* Desktop: carousel */}
      <Flickity
        options={carouselOptions}
        static
        className={twMerge(
          'relative hidden w-full transition-opacity duration-300 md:block',
          !isReady && 'opacity-0',
        )}
        flickityRef={setupFlickityRef}
      >
        {banners}
      </Flickity>
    </>
  );
}
