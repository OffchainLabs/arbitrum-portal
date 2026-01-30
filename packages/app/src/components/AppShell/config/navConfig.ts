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

import type { NavLink } from '../types';

// Master navigation link with icon for mobile bottom nav
export interface MasterNavLinkWithIcon extends NavLink {
  icon: React.ComponentType<{ className?: string }>;
}

// Master navigation links (used in desktop navbar and mobile bottom nav)
export const masterNavLinks: NavLink[] = [
  { label: 'Home', route: '/' },
  { label: 'Bridge', route: '/bridge' },
  { label: 'Explore', route: '/projects' },
  { label: 'Build', route: '/build' },
];

// Master navigation links with icons for mobile bottom nav
export const masterNavLinksWithIcons: MasterNavLinkWithIcon[] = [
  { label: 'Home', route: '/', icon: HomeIcon },
  { label: 'Bridge', route: '/bridge', icon: ArrowsRightLeftIcon },
  { label: 'Explore', route: '/projects', icon: GlobeAltIcon },
  { label: 'Build', route: '/build', icon: CodeBracketIcon },
];

// Side nav item interface
export interface SideNavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  external?: boolean;
  ariaLabel?: string;
}

// Side nav items organized by top-level route
export const sideNavItems: Record<string, SideNavItem[]> = {
  '/': [], // Home has no side nav items
  '/bridge': [
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
  '/projects': [
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

export const mobileSearchExpandedRoutes = ['/projects', '/chains', '/bookmarks'];

export function shouldExpandSearchOnMobile(pathname: string): boolean {
  return mobileSearchExpandedRoutes.some((route) => pathname.startsWith(route));
}
