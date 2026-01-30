import {
  ArrowsRightLeftIcon,
  CircleStackIcon,
  CodeBracketIcon,
  GlobeAltIcon,
  HandRaisedIcon,
  HomeIcon,
  QuestionMarkCircleIcon,
  Squares2X2Icon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';

import { GET_HELP_LINK } from '@/portal/common/constants';

import type { NavLink, NavRoute } from '../types';

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
    icon: ArrowsRightLeftIcon,
    subNavItems: [
      {
        label: 'Bridge',
        href: '/bridge',
        icon: CircleStackIcon,
        ariaLabel: 'Switch to Bridge Tab',
      },
      {
        label: 'Txns',
        href: '/bridge?tab=tx_history',
        icon: CircleStackIcon,
        ariaLabel: 'Switch to Transaction History Tab',
      },
      {
        label: 'Buy',
        href: '/bridge/buy',
        icon: HandRaisedIcon,
        ariaLabel: 'Switch to Buy Tab',
      },
    ],
  },
  '/projects': {
    label: 'Explore',
    route: '/projects',
    icon: GlobeAltIcon,
    subNavItems: [
      {
        label: 'Projects',
        href: '/projects',
        icon: Squares2X2Icon,
      },
      {
        label: 'Chains',
        href: '/chains/ecosystem',
        icon: CircleStackIcon,
      },
      {
        label: 'My Apps',
        href: '/bookmarks',
        icon: UserCircleIcon,
      },
    ],
  },
  '/build': {
    label: 'Build',
    route: '/build',
    icon: CodeBracketIcon,
    subNavItems: [
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
