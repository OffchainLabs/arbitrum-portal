'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { twMerge } from 'tailwind-merge';

import { useSiteBannerVisible } from '@/bridge/components/common/SiteBanner';

import { getSubNavTopPosition } from '../config/navConfig';
import { subNavItems } from '../config/navConfig';
import { useActiveRoute } from '../hooks/useActiveRoute';
import { getActiveSubNavItem } from '../utils/getActiveSubNavItem';

export function SubNav() {
  const activeRoute = useActiveRoute();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isBannerVisible = useSiteBannerVisible({});
  const items = activeRoute ? subNavItems[activeRoute] || [] : [];

  const topPosition = getSubNavTopPosition(isBannerVisible);

  if (items.length === 0) {
    return (
      <aside
        className="fixed left-0 z-40 w-[72px] border-0 bg-black/80 backdrop-blur-sm bottom-0"
        style={{ top: `${topPosition}px` }}
      ></aside>
    );
  }

  return (
    <aside
      className="sticky lg:fixed left-0 z-40 w-[72px] border-0 bg-black/80 backdrop-blur-sm overflow-y-auto bottom-0"
      style={{ top: `${topPosition}px` }}
    >
      {/* Padding matches top navbar px-6 (24px) to align with logo */}
      <nav className="flex flex-col gap-2 py-6 px-2">
        {items.map((item) => {
          const isActive = getActiveSubNavItem(item, activeRoute, pathname, searchParams);
          const Icon = item.icon;

          const content = (
            <div
              className={twMerge(
                'flex flex-col items-center gap-1 rounded-md transition-colors p-1 py-2',
                isActive ? 'cursor-default' : ' hover:bg-white/20 opacity-50',
              )}
            >
              <Icon
                className={twMerge('h-5 w-5 shrink-0', isActive ? 'text-white' : 'text-gray-5')}
              />
              <span
                className={twMerge(
                  'text-xs text-center',
                  isActive ? 'font-semibold text-white' : 'font-light text-white',
                )}
              >
                {item.label}
              </span>
            </div>
          );

          if (item.external) {
            return (
              <a
                key={item.href}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full block"
                aria-label={item.ariaLabel}
              >
                {content}
              </a>
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
