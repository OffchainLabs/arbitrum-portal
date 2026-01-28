'use client';

import {
  CircleStackIcon,
  CodeBracketIcon,
  HandRaisedIcon,
  QuestionMarkCircleIcon,
  Squares2X2Icon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { twMerge } from 'tailwind-merge';

import { GET_HELP_LINK } from '@/portal/common/constants';

import { useActiveRoute } from '../hooks/useActiveRoute';

interface SideNavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  external?: boolean;
}

// Side nav items organized by top-level route
const sideNavItems: Record<string, SideNavItem[]> = {
  '/': [], // Home has no side nav items
  '/bridge': [
    {
      label: 'Bridge',
      href: '/bridge',
      icon: CircleStackIcon,
    },
    {
      label: 'Txns',
      href: '/bridge?tab=tx_history',
      icon: CircleStackIcon,
    },
    {
      label: 'Buy',
      href: '/bridge/buy',
      icon: HandRaisedIcon,
    },
  ],
  '/projects': [
    {
      label: 'Projects',
      href: '/projects',
      icon: Squares2X2Icon, // Grid icon matching Figma
    },
    {
      label: 'Chains',
      href: '/chains/ecosystem',
      icon: CircleStackIcon, // Network icon matching Figma
    },
    {
      label: 'My Apps',
      href: '/bookmarks',
      icon: UserCircleIcon, // User icon matching Figma
    },
  ],
  '/build': [
    {
      label: 'Dev-tools',
      href: '/learn',
      icon: CodeBracketIcon,
    },
    {
      label: 'Connect',
      href: '/community',
      icon: HandRaisedIcon,
    },
    {
      label: 'Help',
      href: GET_HELP_LINK,
      icon: QuestionMarkCircleIcon,
      external: true,
    },
  ],
};

export function SideNav() {
  const activeRoute = useActiveRoute();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const items = activeRoute ? sideNavItems[activeRoute] || [] : [];

  // Determine active side nav item based on current pathname and query params
  const getActiveSideNavItem = (item: SideNavItem): boolean => {
    if (item.external) return false;

    // Special handling for bridge routes
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

    // For other routes, check if pathname starts with item href
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

  // If no items (Home route), show empty state
  if (items.length === 0) {
    return (
      <aside className="fixed left-0 top-14 bottom-0 z-40 w-[72px] border-0 bg-black/80 backdrop-blur-sm">
        {/* Empty state for Home route */}
      </aside>
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
                className="block"
              >
                {content}
              </a>
            );
          }

          return (
            <Link key={item.href} href={item.href} className="block">
              {content}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
