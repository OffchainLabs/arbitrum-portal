'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { twMerge } from 'tailwind-merge';

import { sideNavItems } from '../config/navConfig';
import { useActiveRoute } from '../hooks/useActiveRoute';

export function SideNav() {
  const activeRoute = useActiveRoute();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const items = activeRoute ? sideNavItems[activeRoute] || [] : [];

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

  if (items.length === 0) {
    return (
      <aside className="fixed left-0 top-14 bottom-0 z-40 w-[72px] border-0 bg-black/80 backdrop-blur-sm"></aside>
    );
  }

  return (
    <aside className="fixed left-0 top-14 bottom-0 z-40 w-[72px] border-0 bg-black/80 backdrop-blur-sm overflow-y-auto">
      {/* Padding matches top navbar px-6 (24px) to align with logo */}
      <nav className="flex flex-col gap-2 py-6 px-2">
        {items.map((item) => {
          const isActive = getActiveSideNavItem(item);
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
              >
                {content}
              </a>
            );
          }

          return (
            <Link key={item.href} href={item.href} className="w-full block">
              {content}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
