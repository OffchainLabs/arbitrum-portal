import { BUY_PATHNAME } from '@/bridge/constants'
import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const url = req.nextUrl;

  // Redirect /?mode=embed to /bridge/embed and keep query param (without mode)
  if (url.searchParams.get('mode') === 'embed') {
    url.pathname = '/bridge/embed';
    url.searchParams.delete('mode');
    return NextResponse.redirect(url, 308);
  }

  // Redirect /?tab=buy to /bridge/buy and keep query param (without tab)
  if (url.searchParams.get('mode') === 'buy') {
    url.pathname = BUY_PATHNAME
    url.searchParams.delete('tab')
    return NextResponse.redirect(url, 308)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/bridge/:path*'],
};
