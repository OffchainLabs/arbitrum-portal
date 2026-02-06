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
    href: '/bridge?sourceChain=ethereum&destinationChain=arbitrum-one&tab=bridge&sanitized=true',
    imgSrc: '/icons/navigation/bridge.svg',
    subNavItems: [
      {
        label: 'Bridge',
        href: '/bridge?sourceChain=ethereum&destinationChain=arbitrum-one&tab=bridge&sanitized=true',
        imgSrc: '/icons/navigation/bridge.svg',
        ariaLabel: 'Switch to Bridge Tab',
      },
      {
        label: 'Txns',
        href: '/bridge?tab=tx_history&sourceChain=ethereum&destinationChain=arbitrum-one&sanitized=true',
        imgSrc: '/icons/navigation/transactions.svg',
        ariaLabel: 'Switch to Transaction History Tab',
      },
      {
        label: 'Buy',
        href: '/bridge/buy?sourceChain=arbitrum-one&destinationChain=ethereum&sanitized=true',
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

// Navbar height constants (in pixels)
export const NAVBAR_HEIGHTS = {
  DESKTOP: 66, // Desktop navbar height
  MOBILE: 56, // Mobile navbar header height (h-14 = 3.5rem = 56px)
  MOBILE_BOTTOM: 90, // Mobile bottom navigation height (h-[90px])
  BANNER: 32, // Site banner height
  MOBILE_SPACING: 30, // Additional spacing for mobile content padding
  DESKTOP_SPACING: 30, // Additional spacing for desktop content padding
} as const;

// Pre-computed Tailwind classes for navbar heights
export const NAVBAR_HEIGHT_CLASSES = {
  DESKTOP: `h-[${NAVBAR_HEIGHTS.DESKTOP}px]`,
  MOBILE: 'h-14', // Using Tailwind's h-14 instead of h-[56px] for consistency
} as const;

// Computed positions (Nav + Banner combinations) - returns pixel values
export const getSubNavTopPosition = (isBannerVisible: boolean): number => {
  return isBannerVisible ? NAVBAR_HEIGHTS.BANNER + NAVBAR_HEIGHTS.DESKTOP : NAVBAR_HEIGHTS.DESKTOP;
};

export const getSubNavMobileTopPosition = (isBannerVisible: boolean): string => {
  if (isBannerVisible) {
    const top = NAVBAR_HEIGHTS.BANNER + NAVBAR_HEIGHTS.MOBILE;
    return `top-[${top}px]`;
  }
  return 'top-14'; // Using Tailwind's top-14 instead of top-[56px]
};

// Computed padding for content area (returns pixel values)
export const getDesktopContentPadding = (isBannerVisible: boolean): number => {
  return isBannerVisible
    ? NAVBAR_HEIGHTS.BANNER + NAVBAR_HEIGHTS.DESKTOP + NAVBAR_HEIGHTS.DESKTOP_SPACING
    : NAVBAR_HEIGHTS.DESKTOP + NAVBAR_HEIGHTS.DESKTOP_SPACING;
};

export const getMobileContentPadding = (isBannerVisible: boolean): number => {
  return isBannerVisible
    ? NAVBAR_HEIGHTS.BANNER + NAVBAR_HEIGHTS.MOBILE + NAVBAR_HEIGHTS.MOBILE_SPACING
    : NAVBAR_HEIGHTS.MOBILE + NAVBAR_HEIGHTS.MOBILE_SPACING;
};

export const getMobileContentBottomPadding = (): number => {
  return NAVBAR_HEIGHTS.MOBILE_BOTTOM;
};
