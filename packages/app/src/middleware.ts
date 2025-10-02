import { NextRequest, NextResponse } from 'next/server';

import { BUY_EMBED_PATHNAME, BUY_PATHNAME, EMBED_PATHNAME } from '@/bridge/constants';
import { isOnrampEnabled } from '@/bridge/util/featureFlag';

export function middleware(req: NextRequest) {
  const url = req.nextUrl;

  // Redirect /?mode=embed to /bridge/embed and keep query params (without mode)
  if (url.searchParams.get('mode') === 'embed') {
    url.pathname = EMBED_PATHNAME;
    url.searchParams.delete('mode');
    return NextResponse.redirect(url, 308);
  }

  // In embed mode, when buy is disabled
  // Redirect /bridge/embed/buy to /bridge/embed and keep query params (without tab)
  if (
    url.pathname === BUY_EMBED_PATHNAME &&
    (!isOnrampEnabled() || url.searchParams.get('disabledFeatures')?.includes('buy'))
  ) {
    url.pathname = '/bridge/embed';
    url.searchParams.delete('tab');
    return NextResponse.redirect(url, 308);
  }

  // In normal mode, when buy is disabled
  // Redirect /bridge/buy to /bridge and keep query params
  if (
    url.pathname === BUY_PATHNAME &&
    (!isOnrampEnabled() || url.searchParams.get('disabledFeatures')?.includes('buy'))
  ) {
    url.pathname = '/bridge';
    url.searchParams.set('tab', 'bridge');
    return NextResponse.redirect(url, 308);
  }

  // Redirect /?tab=buy to /bridge/buy and keep query params (without tab)
  if (url.searchParams.get('tab') === 'buy') {
    url.pathname = BUY_PATHNAME;
    url.searchParams.delete('tab');
    return NextResponse.redirect(url, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/bridge/:path*'],
};
