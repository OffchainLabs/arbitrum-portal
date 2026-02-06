'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { twMerge } from 'tailwind-merge';

import { useSiteBannerVisible } from '@/bridge/components/common/SiteBanner';
import { ExternalLink } from '@/portal/components/ExternalLink';

import { getSubNavMobileTopPosition } from '../../config/navConfig';
import { subNavItems } from '../../config/navConfig';
import { useActiveRoute } from '../../hooks/useActiveRoute';
import { getActiveSubNavItem } from '../../utils/getActiveSubNavItem';

export function SubNavMobile() {
  const activeRoute = useActiveRoute();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isBannerVisible = useSiteBannerVisible();
  const items = activeRoute ? subNavItems[activeRoute] || [] : [];

  if (items.length === 0) {
    return null;
  }

  return (
    <nav
      className={`sticky z-40 flex w-full items-center gap-2 border-none bg-black/70 backdrop-blur-sm p-4 pt-0 md:hidden overflow-hidden ${getSubNavMobileTopPosition(isBannerVisible)}`}
    >
      <div className="flex items-center gap-2 bg-neutral-25 rounded-md w-full overflow-hidden p-0.5">
        {items.map((item) => {
          const isActive = getActiveSubNavItem(item, activeRoute, pathname, searchParams);
          const Icon = item.icon;

          const content = (
            <div
              className={twMerge(
                'rounded-md px-4 h-full text-sm transition-colors flex items-center gap-2 justify-center whitespace-nowrap w-full touch-manipulation',
                isActive ? 'bg-white/5 text-white' : 'bg-transparent text-white',
              )}
              style={{ minHeight: '44px' }}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </div>
          );

          if (item.external) {
            return (
              <ExternalLink
                key={item.href}
                href={item.href}
                className="flex-1 flex-shrink-0"
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
              className="flex-1 flex-shrink-0"
              aria-label={item.ariaLabel}
            >
              {content}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
