import type { SubNavItem } from '../config/navConfig';
import type { NavRoute } from '../types';

function parseHref(href: string): { pathname: string; searchParams: URLSearchParams } {
  const [pathname, search] = href.split('?');
  return {
    pathname: pathname || href,
    searchParams: new URLSearchParams(search),
  };
}

export function getActiveSubNavItem(
  item: SubNavItem,
  activeRoute: NavRoute | null,
  pathname: string,
  searchParams: URLSearchParams,
): boolean {
  if (item.external) return false;

  if (activeRoute === '/bridge') {
    const itemUrl = parseHref(item.href);
    const itemTab = itemUrl.searchParams.get('tab');

    if (itemUrl.pathname === '/bridge/buy') {
      return pathname.startsWith('/bridge/buy');
    }

    if (itemUrl.pathname === '/bridge') {
      const currentTab = searchParams.get('tab');

      if (itemTab === 'tx_history') {
        return pathname === '/bridge' && currentTab === 'tx_history';
      }

      if (itemTab === 'bridge' || !itemTab) {
        return (
          pathname === '/bridge' &&
          !pathname.startsWith('/bridge/buy') &&
          currentTab !== 'tx_history'
        );
      }
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
