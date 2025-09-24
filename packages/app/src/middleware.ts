import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const url = req.nextUrl

  // Redirect /?mode=embed to /bridge/embed and keep query param (without mode)
  if (url.searchParams.get('mode') === 'embed') {
    url.pathname = '/bridge/embed'
    url.searchParams.delete('mode')
    return NextResponse.redirect(url, 308)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/bridge/:path*']
}
