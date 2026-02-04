import Image from 'next/image';

import { GET_HELP_LINK } from '@/portal/common/constants';

import type { NavLink, NavRoute } from '../types';

// Helper to create icon component
function createIcon(src: string, alt: string): React.ComponentType<{ className?: string }> {
  const Icon = ({ className }: { className?: string }) => (
    <Image src={src} alt={alt} width={24} height={24} className={className} />
  );
  Icon.displayName = alt;
  return Icon;
}

// Sub nav item interface
export interface SubNavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  external?: boolean;
  ariaLabel?: string;
}

// Navigation config item interface
export interface NavConfigItem {
  label: string;
  route: NavRoute;
  icon: React.ComponentType<{ className?: string }>;
  subNavItems: SubNavItem[];
}

// Consolidated navigation configuration
export const NAV_CONFIG: Record<NavRoute, NavConfigItem> = {
  '/': {
    label: 'Home',
    route: '/',
    icon: createIcon('/icons/navigation/home.svg', 'Home'),
    subNavItems: [],
  },
  '/bridge': {
    label: 'Bridge',
    route: '/bridge',
    icon: createIcon('/icons/navigation/bridge.svg', 'Bridge'),
    subNavItems: [
      {
        label: 'Bridge',
        href: '/bridge',
        icon: createIcon('/icons/navigation/bridge.svg', 'Bridge'),
        ariaLabel: 'Switch to Bridge Tab',
      },
      {
        label: 'Txns',
        href: '/bridge?tab=tx_history',
        icon: createIcon('/icons/navigation/transactions.svg', 'Transactions'),
        ariaLabel: 'Switch to Transaction History Tab',
      },
      {
        label: 'Buy',
        href: '/bridge/buy',
        icon: createIcon('/icons/navigation/buy.svg', 'Buy'),
        ariaLabel: 'Switch to Buy Tab',
      },
    ],
  },
  '/projects': {
    label: 'Explore',
    route: '/projects',
    icon: createIcon('/icons/navigation/explore.svg', 'Explore'),
    subNavItems: [
      {
        label: 'Projects',
        href: '/projects',
        icon: createIcon('/icons/navigation/projects.svg', 'Projects'),
      },
      {
        label: 'Chains',
        href: '/chains/ecosystem',
        icon: createIcon('/icons/navigation/chains.svg', 'Chains'),
      },
      {
        label: 'My Apps',
        href: '/bookmarks',
        icon: createIcon('/icons/navigation/my-apps.svg', 'My Apps'),
      },
    ],
  },
  '/build': {
    label: 'Build',
    route: '/build',
    icon: createIcon('/icons/navigation/build.svg', 'Build'),
    subNavItems: [
      {
        label: 'Dev-tools',
        href: '/learn',
        icon: createIcon('/icons/navigation/devtools.svg', 'Dev Tools'),
      },
      {
        label: 'Connect',
        href: '/community',
        icon: createIcon('/icons/navigation/connect.svg', 'Connect'),
      },
      {
        label: 'Help',
        href: GET_HELP_LINK,
        icon: createIcon('/icons/navigation/help.svg', 'Help'),
        external: true,
      },
    ],
  },
};

export const navLinks: NavLink[] = Object.values(NAV_CONFIG).map(({ label, route }) => ({
  label,
  route,
}));

export interface NavLinkWithIcon extends NavLink {
  icon: React.ComponentType<{ className?: string }>;
}

export const navLinksWithIcons: NavLinkWithIcon[] = Object.values(NAV_CONFIG).map(
  ({ label, route, icon }) => ({
    label,
    route,
    icon,
  }),
);

export const subNavItems: Record<string, SubNavItem[]> = Object.fromEntries(
  Object.entries(NAV_CONFIG).map(([route, config]) => [route, config.subNavItems]),
);

export const mobileSearchExpandedRoutes = ['/projects', '/chains', '/bookmarks'];

export function shouldExpandSearchOnMobile(pathname: string): boolean {
  return mobileSearchExpandedRoutes.some((route) => pathname.startsWith(route));
}
