import Image from 'next/image';
import { ComponentType } from 'react';

import { GET_HELP_LINK } from '@/portal/common/constants';

import type { NavLink, NavRoute } from '../types';

function createIconComponent(src: string, alt: string): ComponentType<{ className?: string }> {
  return function Icon({ className }: { className?: string }) {
    return <Image src={src} alt={alt} width={24} height={24} className={className} />;
  };
}

// Navigation icons
const HomeIcon = createIconComponent('/icons/navigation/home.svg', 'Home');
const BridgeIcon = createIconComponent('/icons/navigation/bridge.svg', 'Bridge');
const ExploreIcon = createIconComponent('/icons/navigation/explore.svg', 'Explore');
const BuildIcon = createIconComponent('/icons/navigation/build.svg', 'Build');
const TransactionsIcon = createIconComponent('/icons/navigation/transactions.svg', 'Transactions');
const BuyIcon = createIconComponent('/icons/navigation/buy.svg', 'Buy');
const ProjectsIcon = createIconComponent('/icons/navigation/projects.svg', 'Projects');
const ChainsIcon = createIconComponent('/icons/navigation/chains.svg', 'Chains');
const MyAppsIcon = createIconComponent('/icons/navigation/my-apps.svg', 'My Apps');
const DevToolsIcon = createIconComponent('/icons/navigation/devtools.svg', 'Dev Tools');
const ConnectIcon = createIconComponent('/icons/navigation/connect.svg', 'Connect');
const HelpIcon = createIconComponent('/icons/navigation/help.svg', 'Help');

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
    icon: HomeIcon,
    subNavItems: [],
  },
  '/bridge': {
    label: 'Bridge',
    route: '/bridge',
    icon: BridgeIcon,
    subNavItems: [
      {
        label: 'Bridge',
        href: '/bridge',
        icon: BridgeIcon,
        ariaLabel: 'Switch to Bridge Tab',
      },
      {
        label: 'Txns',
        href: '/bridge?tab=tx_history',
        icon: TransactionsIcon,
        ariaLabel: 'Switch to Transaction History Tab',
      },
      {
        label: 'Buy',
        href: '/bridge/buy',
        icon: BuyIcon,
        ariaLabel: 'Switch to Buy Tab',
      },
    ],
  },
  '/projects': {
    label: 'Explore',
    route: '/projects',
    icon: ExploreIcon,
    subNavItems: [
      {
        label: 'Projects',
        href: '/projects',
        icon: ProjectsIcon,
      },
      {
        label: 'Chains',
        href: '/chains/ecosystem',
        icon: ChainsIcon,
      },
      {
        label: 'My Apps',
        href: '/bookmarks',
        icon: MyAppsIcon,
      },
    ],
  },
  '/build': {
    label: 'Build',
    route: '/build',
    icon: BuildIcon,
    subNavItems: [
      {
        label: 'Dev-tools',
        href: '/learn',
        icon: DevToolsIcon,
      },
      {
        label: 'Connect',
        href: '/community',
        icon: ConnectIcon,
      },
      {
        label: 'Help',
        href: GET_HELP_LINK,
        icon: HelpIcon,
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
