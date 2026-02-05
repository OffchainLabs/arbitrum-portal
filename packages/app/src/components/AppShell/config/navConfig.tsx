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
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  subNavItems: SubNavItem[];
}

// Consolidated navigation configuration
export const NAV_CONFIG: Record<NavRoute, NavConfigItem> = {
  '/': {
    label: 'Home',
    route: '/',
    href: '/',
    icon: createIcon('/icons/navigation/home.svg', 'Home'),
    subNavItems: [],
  },
  '/bridge': {
    label: 'Bridge',
    route: '/bridge',
    href: '/bridge?sourceChain=ethereum&destinationChain=arbitrum-one&tab=bridge&sanitized=true',
    icon: createIcon('/icons/navigation/bridge.svg', 'Bridge'),
    subNavItems: [
      {
        label: 'Bridge',
        href: '/bridge?sourceChain=ethereum&destinationChain=arbitrum-one&tab=bridge&sanitized=true',
        icon: createIcon('/icons/navigation/bridge.svg', 'Bridge'),
        ariaLabel: 'Switch to Bridge Tab',
      },
      {
        label: 'Txns',
        href: '/bridge?tab=tx_history&sourceChain=ethereum&destinationChain=arbitrum-one&sanitized=true',
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
    href: '/projects',
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
    href: '/build',
    icon: createIcon('/icons/navigation/build.svg', 'Build'),
    subNavItems: [
      {
        href: '/build',
        label: 'Tools',
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

export const navLinks: NavLink[] = Object.values(NAV_CONFIG).map(({ label, route, href }) => ({
  label,
  route,
  href,
}));

export interface NavLinkWithIcon extends NavLink {
  icon: React.ComponentType<{ className?: string }>;
}

export const navLinksWithIcons: NavLinkWithIcon[] = Object.values(NAV_CONFIG).map(
  ({ label, route, href, icon }) => ({
    label,
    route,
    href,
    icon,
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
  SUBNAV_MOBILE: 60, // SubNavMobile height (44px content + 16px padding)
  DESKTOP_SPACING: 34, // Additional spacing for desktop content padding
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
    ? NAVBAR_HEIGHTS.BANNER + NAVBAR_HEIGHTS.MOBILE + NAVBAR_HEIGHTS.SUBNAV_MOBILE
    : NAVBAR_HEIGHTS.MOBILE + NAVBAR_HEIGHTS.SUBNAV_MOBILE;
};

export const getMobileContentBottomPadding = (): number => {
  return NAVBAR_HEIGHTS.MOBILE_BOTTOM;
};
