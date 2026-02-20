import { NextRequest, NextResponse } from 'next/server';

import { PathnameEnum } from '@/bridge/constants';
import { isOnrampFeatureEnabled } from '@/bridge/util/queryParamUtils';

export function proxy(req: NextRequest) {
  const url = req.nextUrl;

  const disabledFeaturesParam = url.searchParams.getAll('disabledFeatures');
  const isOnrampEnabled = isOnrampFeatureEnabled({ disabledFeatures: disabledFeaturesParam });

  // Redirect /?mode=embed to /bridge/embed and keep query params (without mode)
  if (url.searchParams.get('mode') === 'embed') {
    url.pathname = PathnameEnum.EMBED;
    url.searchParams.delete('mode');
    return NextResponse.redirect(url, 308);
  }

  // In embed mode, when onramp is disabled
  // Redirect /bridge/embed/buy to /bridge/embed and keep query params (without tab)
  if (url.pathname === PathnameEnum.EMBED_BUY && !isOnrampEnabled) {
    url.pathname = PathnameEnum.EMBED;
    url.searchParams.delete('tab');
    return NextResponse.redirect(url, 308);
  }

  // In normal mode, when onramp is disabled
  // Redirect /bridge/buy to /bridge and keep query params
  if (url.pathname === PathnameEnum.BUY && !isOnrampEnabled) {
    url.pathname = '/bridge';
    url.searchParams.set('tab', 'bridge');
    return NextResponse.redirect(url, 308);
  }

  // Redirect /?tab=buy to /bridge/buy and keep query params (without tab)
  if (url.searchParams.get('tab') === 'buy') {
    url.pathname = PathnameEnum.BUY;
    url.searchParams.delete('tab');
    return NextResponse.redirect(url, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/bridge/:path*'],
};
