import type { SubNavItem } from '../config/navConfig';

const BRIDGE_PARAMS_TO_PRESERVE = ['sourceChain', 'destinationChain', 'sanitized'] as const;

export function getBridgeLinkWithPreservedQueryParams(
  item: SubNavItem,
  currentSearchParams: URLSearchParams,
): string {
  const [pathname = '/bridge', search] = item.href.split('?');
  const itemParams = new URLSearchParams(search ?? '');
  const tab = itemParams.get('tab');
  const isBuy = pathname === '/bridge/buy';

  const params = new URLSearchParams();
  for (const key of BRIDGE_PARAMS_TO_PRESERVE) {
    const v = currentSearchParams.get(key);
    if (v) params.set(key, v);
  }
  if (!isBuy && tab) params.set('tab', tab);
  const q = params.toString();
  return q ? `${pathname}?${q}` : pathname;
}
