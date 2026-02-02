'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { twMerge } from 'tailwind-merge';

import { subNavItems } from '../../config/navConfig';
import { getActiveSubNavItem } from '../../utils/getActiveSubNavItem';
import { useActiveRoute } from '../../hooks/useActiveRoute';

export function SubNavMobile() {
  const activeRoute = useActiveRoute();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const items = activeRoute ? subNavItems[activeRoute] || [] : [];

  if (items.length === 0) {
    return null;
  }

  return (
    <nav className="sticky top-14 z-40 flex w-full items-center gap-2 border-none bg-black/70 backdrop-blur-sm p-4 md:hidden overflow-hidden">
      <div className="flex items-center gap-2 bg-gray-8/50 rounded-md h-[44px] w-full overflow-x-auto">
        {items.map((item) => {
          const isActive = getActiveSubNavItem(item, activeRoute, pathname, searchParams);
          const Icon = item.icon;

          const content = (
            <div
              className={twMerge(
                'rounded-md px-4 h-full text-sm transition-colors flex items-center gap-2 justify-center whitespace-nowrap min-h-[44px] w-full touch-manipulation',
                isActive ? 'bg-white/10 text-white' : 'bg-transparent text-white/70',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </div>
          );

          if (item.external) {
            return (
              <a
                key={item.href}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex-shrink-0"
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
