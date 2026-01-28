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
      return pathname.startsWith('/learn');
    }
    if (item.href === '/community') {
      return pathname.startsWith('/community');
    }

    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  };

  // If no items (Home route), show empty state
  if (items.length === 0) {
    return (
      <aside className="w-16 border-r border-gray-8 bg-gray-1 p-4">
        {/* Empty state for Home route */}
      </aside>
    );
  }

  return (
    <aside className="w-16 border-r border-gray-8 bg-gray-1 p-4">
      <nav className="flex flex-col gap-2">
        {items.map((item) => {
          const isActive = getActiveSideNavItem(item);
          const Icon = item.icon;

          const content = (
            <div
              className={twMerge(
                'flex flex-col items-center gap-2 rounded-lg p-3 transition-colors',
                isActive
                  ? 'bg-gray-8 text-white'
                  : 'text-white/70 hover:bg-gray-8/50 hover:text-white',
              )}
            >
              <Icon className="h-6 w-6" />
              <span className="text-sm font-medium">{item.label}</span>
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
