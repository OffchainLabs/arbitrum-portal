import { NextRequest, NextResponse } from 'next/server';

import { PathnameEnum } from '@/bridge/constants';
import { isEarnEnabled } from '@/bridge/util/featureFlag';
import { isOnrampFeatureEnabled } from '@/bridge/util/queryParamUtils';

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const isEarnApiRequest = url.pathname.startsWith('/api/onchain-actions/v1/earn');

  const disabledFeaturesParam = url.searchParams.getAll('disabledFeatures');
  const isOnrampEnabled = isOnrampFeatureEnabled({ disabledFeatures: disabledFeaturesParam });
  const earnEnabled = isEarnEnabled();

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

  if (isEarnApiRequest && !earnEnabled) {
    return new NextResponse(null, { status: 404 });
  }

  if (url.pathname.startsWith('/earn') && !earnEnabled) {
    url.pathname = '/';
    url.search = '';
    return NextResponse.redirect(url, 308);
  }

  // Redirect /?tab=buy to /bridge/buy and keep query params (without tab)
  if (url.searchParams.get('tab') === 'buy') {
    url.pathname = PathnameEnum.BUY;
    url.searchParams.delete('tab');
    return NextResponse.redirect(url, 308);
  }

  // Redirect /?tab=tx_history to /bridge/tx-history and keep query params (without tab)
  if (url.searchParams.get('tab') === 'tx_history') {
    url.pathname = PathnameEnum.TX_HISTORY;
    url.searchParams.delete('tab');
    return NextResponse.redirect(url, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/bridge/:path*', '/earn/:path*', '/api/onchain-actions/v1/earn/:path*'],
};
