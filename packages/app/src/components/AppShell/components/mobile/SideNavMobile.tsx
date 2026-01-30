'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { twMerge } from 'tailwind-merge';

import { sideNavItems } from '../../config/navConfig';
import { useActiveRoute } from '../../hooks/useActiveRoute';

export function SideNavMobile() {
  const activeRoute = useActiveRoute();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const items = activeRoute ? sideNavItems[activeRoute] || [] : [];

  if (items.length === 0) {
    return null;
  }

  const getActiveSideNavItem = (item: (typeof items)[0]): boolean => {
    if (item.external) return false;

    if (activeRoute === '/bridge') {
      if (item.href === '/bridge?tab=tx_history') {
        return pathname === '/bridge' && searchParams.get('tab') === 'tx_history';
      }
      if (item.href === '/bridge/buy') {
        return pathname.startsWith('/bridge/buy');
      }
      if (item.href === '/bridge') {
        return (
          pathname === '/bridge' &&
          !pathname.startsWith('/bridge/buy') &&
          searchParams.get('tab') !== 'tx_history'
        );
      }
    }

    if (item.href === '/projects') {
      return pathname === '/projects' || pathname.startsWith('/projects/');
    }
    if (item.href === '/chains/ecosystem') {
      return pathname.startsWith('/chains/ecosystem');
    }
    if (item.href === '/bookmarks') {
      return pathname.startsWith('/bookmarks');
    }
    if (item.href === '/learn') {
      // Dev-tools should be active for both /learn and /build routes
      return pathname.startsWith('/learn') || pathname.startsWith('/build');
    }
    if (item.href === '/community') {
      return pathname.startsWith('/community');
    }

    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  };

  return (
    <nav className="sticky top-14 z-40 flex w-full items-center gap-2 border-none bg-black/70 backdrop-blur-sm p-4 md:hidden overflow-hidden">
      <div className="flex items-center gap-2 bg-gray-8/50 rounded-md h-[44px] w-full overflow-x-auto">
        {items.map((item) => {
          const isActive = getActiveSideNavItem(item);

          const content = (
            <div
              className={twMerge(
                'rounded-md px-4 h-full text-sm transition-colors flex items-center justify-center whitespace-nowrap min-h-[44px] w-full touch-manipulation',
                isActive ? 'bg-white/10 text-white' : 'bg-transparent text-white/70',
              )}
            >
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
