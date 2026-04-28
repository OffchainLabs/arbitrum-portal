import type { SubNavItem } from '../config/navConfig';
import type { NavRoute } from '../types';

function getPathnameFromHref(href: string): string {
  const [pathname] = href.split('?');
  return pathname || href;
}

export function getIsActiveSubNavItem(
  item: SubNavItem,
  activeRoute: NavRoute | null,
  pathname: string,
): boolean {
  if (item.external) return false;

  if (activeRoute === '/bridge') {
    const itemPathname = getPathnameFromHref(item.href);

    if (itemPathname === '/bridge/buy') {
      return pathname.startsWith('/bridge/buy');
    }

    if (itemPathname === '/bridge/tx-history') {
      return pathname.startsWith('/bridge/tx-history');
    }

    if (itemPathname === '/bridge') {
      return pathname === '/bridge';
    }
  }

  if (item.href === '/projects') {
    return pathname === '/projects' || pathname.startsWith('/projects/');
  }
  if (item.href === '/chains/ecosystem') {
    return pathname.startsWith('/chains');
  }
  if (item.href === '/bookmarks') {
    return pathname.startsWith('/bookmarks');
  }
  if (item.href === '/build') {
    // Tools subnav should be active for both /build and /learn routes
    return pathname.startsWith('/build') || pathname.startsWith('/learn');
  }
  if (item.href === '/learn') {
    // Dev-tools should be active for both /learn and /build routes
    return pathname.startsWith('/learn') || pathname.startsWith('/build');
  }
  if (item.href === '/community') {
    return pathname.startsWith('/community');
  }

  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
