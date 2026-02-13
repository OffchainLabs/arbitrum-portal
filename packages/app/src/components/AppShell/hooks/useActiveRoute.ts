'use client';

import { usePathname } from 'next/navigation';

import type { NavRoute } from '../types';

export function useActiveRoute(): NavRoute | null {
  const pathname = usePathname();

  if (pathname === '/') {
    return '/';
  }

  if (pathname.startsWith('/bridge')) {
    return '/bridge';
  }

  if (
    pathname.startsWith('/projects') ||
    pathname.startsWith('/chains') ||
    pathname.startsWith('/bookmarks')
  ) {
    return '/projects';
  }

  if (
    pathname.startsWith('/build') ||
    pathname.startsWith('/learn') ||
    pathname.startsWith('/community')
  ) {
    return '/build';
  }

  return null;
}
