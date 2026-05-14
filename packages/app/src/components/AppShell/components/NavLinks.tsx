'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { twMerge } from 'tailwind-merge';

import { useSiteBannerVisible } from '@/bridge/components/common/SiteBanner';

import { navLinksWithIcons } from '../config/navConfig';
import { useActiveRoute } from '../hooks/useActiveRoute';

const FEATURED_ACTIVE_INDICATOR_STYLE = {
  background: 'linear-gradient(180deg, rgba(25, 50, 85, 0.95) 0%, rgba(20, 35, 65, 0.95) 100%)',
  boxShadow: 'inset 0 0 0 1px rgba(12, 74, 237, 0.5)',
};

const FEATURED_ICON_FILTER =
  'brightness(0) saturate(100%) invert(50%) sepia(90%) saturate(1500%) hue-rotate(190deg) brightness(105%) contrast(90%)';

export function NavLinks() {
  const activeRoute = useActiveRoute();
  const isBannerVisible = useSiteBannerVisible();
  const containerRef = useRef<HTMLDivElement>(null);
  const linkRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const activeIndex = navLinksWithIcons.findIndex((l) => l.route === activeRoute);
  const [indicator, setIndicator] = useState({ left: 0, width: 0, top: 0, height: 0 });
  const isFeaturedActive = activeIndex >= 0 && navLinksWithIcons[activeIndex]?.isFeatured;

  // This effect is used to update the indicator position when the active link changes in order to show a sliding animation
  useEffect(() => {
    const container = containerRef.current;
    const activeLink = activeIndex >= 0 ? linkRefs.current[activeIndex] : null;
    if (!container || !activeLink) return;

    const update = () => {
      const c = container.getBoundingClientRect();
      const l = activeLink.getBoundingClientRect();
      setIndicator({
        left: l.left - c.left,
        width: l.width,
        top: l.top - c.top,
        height: l.height,
      });
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(container);
    return () => ro.disconnect();
  }, [activeIndex]);

  return (
    <div
      ref={containerRef}
      className={twMerge(
        'fixed bottom-0 left-0 right-0 z-50 flex h-[90px] p-2 w-full items-center justify-around bg-black/80 backdrop-blur-sm',
        'gap-1.5 md:bg-neutral-25 rounded-md',
        'md:top-3 md:left-1/2 md:-translate-x-1/2 md:w-fit md:h-10 md:p-0 md:justify-normal',
        isBannerVisible && 'md:top-12',
      )}
    >
      {activeIndex >= 0 && (
        <>
          <div
            className="absolute -z-10 rounded-[10px] transition-[left,width,top,height] duration-200 ease-out md:hidden"
            style={{
              left: indicator.left,
              width: indicator.width,
              top: indicator.top,
              height: indicator.height,
              ...(isFeaturedActive
                ? FEATURED_ACTIVE_INDICATOR_STYLE
                : {
                    background:
                      'radial-gradient(ellipse at center bottom, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 70%), rgba(255,255,255,0.1)',
                  }),
            }}
            aria-hidden
          />
          <div
            className={twMerge(
              'absolute -z-10 hidden rounded-md transition-[left,width,top,height] duration-200 ease-out md:block',
              !isFeaturedActive && 'bg-white/10',
            )}
            style={{
              left: indicator.left,
              width: indicator.width,
              top: indicator.top,
              height: indicator.height,
              ...(isFeaturedActive ? FEATURED_ACTIVE_INDICATOR_STYLE : {}),
            }}
            aria-hidden
          />
        </>
      )}

      {navLinksWithIcons.map((link, index) => {
        const isActive = activeRoute === link.route;

        return (
          <Link
            ref={(el) => {
              linkRefs.current[index] = el;
            }}
            key={link.route}
            href={link.href}
            prefetch={true}
            className={twMerge(
              'flex flex-1 flex-col items-center rounded justify-center gap-2 transition-colors duration-200 h-full touch-manipulation relative',
              'md:rounded-md md:px-4 md:flex-row md:touch-auto md:flex-initial',
              isActive ? 'text-white' : 'bg-transparent text-white/70 hover:opacity-50',
            )}
          >
            <Image
              src={link.imgSrc}
              alt={link.label}
              width={32}
              height={32}
              className={twMerge(
                'h-8 w-8 shrink-0 stroke-2 text-white transition-colors duration-200',
                isActive ? 'text-white' : 'text-white/70',
                'md:hidden',
              )}
              style={link.isFeatured ? { filter: FEATURED_ICON_FILTER } : undefined}
            />

            <span
              className={twMerge(
                'text-[10px] leading-[12px] tracking-tight text-inherit transition-colors duration-200',
                'md:text-sm',
                link.isFeatured && 'inline-flex items-center',
              )}
            >
              {link.isFeatured ? (
                <>
                  <span className="bg-blue bg-clip-text text-transparent">{link.label}</span>
                  <Image
                    src="/images/sparkles.svg"
                    alt=""
                    width={14}
                    height={14}
                    className="ml-0.5 h-2.5 w-2.5 shrink-0 md:h-3.5 md:w-3.5"
                    aria-hidden
                  />
                </>
              ) : (
                link.label
              )}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
