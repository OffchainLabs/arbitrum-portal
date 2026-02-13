import { GET_HELP_LINK } from '@/portal/common/constants';

import type { NavLink, NavRoute } from '../types';

export interface SubNavItem {
  label: string;
  href: string;
  imgSrc: string;
  external?: boolean;
  ariaLabel?: string;
}

export interface NavConfigItem {
  label: string;
  route: NavRoute;
  href: string;
  imgSrc: string;
  subNavItems: SubNavItem[];
}

export const NAV_CONFIG: Record<NavRoute, NavConfigItem> = {
  '/': {
    label: 'Home',
    route: '/',
    href: '/',
    imgSrc: '/icons/navigation/home.svg',
    subNavItems: [],
  },
  '/bridge': {
    label: 'Bridge',
    route: '/bridge',
    href: '/bridge',
    imgSrc: '/icons/navigation/bridge.svg',
    subNavItems: [
      {
        label: 'Bridge',
        href: '/bridge',
        imgSrc: '/icons/navigation/bridge.svg',
        ariaLabel: 'Switch to Bridge Tab',
      },
      {
        label: 'Txns',
        href: '/bridge?tab=tx_history',
        imgSrc: '/icons/navigation/transactions.svg',
        ariaLabel: 'Switch to Transaction History Tab',
      },
      {
        label: 'Buy',
        href: '/bridge/buy',
        imgSrc: '/icons/navigation/buy.svg',
        ariaLabel: 'Switch to Buy Tab',
      },
    ],
  },
  '/projects': {
    label: 'Explore',
    route: '/projects',
    href: '/projects',
    imgSrc: '/icons/navigation/explore.svg',
    subNavItems: [
      {
        label: 'Projects',
        href: '/projects',
        imgSrc: '/icons/navigation/projects.svg',
      },
      {
        label: 'Chains',
        href: '/chains/ecosystem',
        imgSrc: '/icons/navigation/chains.svg',
      },
      {
        label: 'My Apps',
        href: '/bookmarks',
        imgSrc: '/icons/navigation/my-apps.svg',
      },
    ],
  },
  '/build': {
    label: 'Build',
    route: '/build',
    href: '/build',
    imgSrc: '/icons/navigation/build.svg',
    subNavItems: [
      {
        href: '/build',
        label: 'Tools',
        imgSrc: '/icons/navigation/devtools.svg',
      },
      {
        label: 'Connect',
        href: '/community',
        imgSrc: '/icons/navigation/connect.svg',
      },
      {
        label: 'Help',
        href: GET_HELP_LINK,
        imgSrc: '/icons/navigation/help.svg',
        external: true,
      },
    ],
  },
};

export const navLinks: NavLink[] = Object.values(NAV_CONFIG).map(({ label, route, href }) => ({
  label,
  route,
  href,
}));

export interface NavLinkWithIcon extends NavLink {
  imgSrc: string;
}

export const navLinksWithIcons: NavLinkWithIcon[] = Object.values(NAV_CONFIG).map(
  ({ label, route, href, imgSrc }) => ({
    label,
    route,
    href,
    imgSrc,
  }),
);

export const subNavItems: Record<string, SubNavItem[]> = Object.fromEntries(
  Object.entries(NAV_CONFIG).map(([route, config]) => [route, config.subNavItems]),
);
