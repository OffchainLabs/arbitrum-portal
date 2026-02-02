import type { SubNavItem } from '../config/navConfig';
import type { NavRoute } from '../types';

export function getActiveSubNavItem(
  item: SubNavItem,
  activeRoute: NavRoute | null,
  pathname: string,
  searchParams: URLSearchParams,
): boolean {
  if (item.external) return false;

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
    // Dev-tools should be active for both /learn and /build routes
    return pathname.startsWith('/learn') || pathname.startsWith('/build');
  }
  if (item.href === '/community') {
    return pathname.startsWith('/community');
  }

  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
