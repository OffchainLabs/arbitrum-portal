'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { twMerge } from 'tailwind-merge';

import { useSiteBannerVisible } from '@/bridge/components/common/SiteBanner';
import { ExternalLink } from '@/portal/components/ExternalLink';

import { subNavItems } from '../config/navConfig';
import { useActiveRoute } from '../hooks/useActiveRoute';
import { getIsActiveSubNavItem } from '../utils/getIsActiveSubNavItem';

export function SubNav() {
  const activeRoute = useActiveRoute();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isBannerVisible = useSiteBannerVisible();
  const items = activeRoute ? subNavItems[activeRoute] || [] : [];

  const subNavTopClasses = twMerge(
    'top-[theme(navbar.desktop)]',
    'data-[banner=true]:top-[calc(theme(navbar.desktop)+theme(navbar.bannerDesktop))]',
    'data-[banner=true]:top-[calc(theme(navbar.mobile)+theme(navbar.bannerMobile))]',
  );

  if (items.length === 0) {
    return (
      <aside
        className={twMerge(
          'left-0 z-40 w-[72px] border-0 bg-black/80 backdrop-blur-sm bottom-0 hidden',
          subNavTopClasses,
        )}
        data-banner={isBannerVisible ? 'true' : undefined}
      />
    );
  }

  return (
    <aside
      className={twMerge(
        'sticky left-0 z-40 border-0 bg-black/80 backdrop-blur-sm overflow-y-auto bottom-0 px-4 mb-4',
        'md:fixed md:w-[72px] md:px-0 md:mb-0',
        subNavTopClasses,
      )}
      data-banner={isBannerVisible ? 'true' : undefined}
    >
      {/* Padding matches top navbar px-6 (24px) to align with logo */}
      <nav
        className={twMerge(
          'flex md:flex-col gap-2 p-0.5 bg-neutral-25 rounded-md',
          'md:rounded-none md:bg-transparent md:py-6 md:px-2',
        )}
      >
        {items.map((item) => {
          const isActive = getIsActiveSubNavItem(item, activeRoute, pathname, searchParams);

          const content = (
            <div
              className={twMerge(
                'flex items-center gap-2 rounded-md transition-colors p-1 py-2 min-h-[44px] justify-center',
                'md:flex-col md:min-h-0',
                isActive ? 'bg-white/5 text-white' : 'bg-transparent text-white',
                isActive ? 'md:bg-transparent cursor-default' : ' hover:bg-white/20 md:opacity-50',
              )}
            >
              <Image
                src={item.imgSrc}
                alt={item.label}
                width={20}
                height={20}
                className={twMerge(
                  'h-4 w-4 md:h-5 md:w-5 shrink-0',
                  isActive ? 'text-white' : 'text-gray-5',
                )}
              />
              <span
                className={twMerge(
                  'text-sm text-center',
                  'md:text-xs',
                  isActive ? 'font-semibold text-white' : 'md:font-light text-white',
                )}
              >
                {item.label}
              </span>
            </div>
          );

          if (item.external) {
            return (
              <ExternalLink
                key={item.href}
                href={item.href}
                className="w-full block"
                aria-label={item.ariaLabel}
              >
                {content}
              </ExternalLink>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className="w-full block"
              aria-label={item.ariaLabel}
            >
              {content}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
