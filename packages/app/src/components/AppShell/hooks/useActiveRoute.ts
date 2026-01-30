'use client';

import { usePathname } from 'next/navigation';

import type { NavRoute } from '../types';

// Hook for detecting active route
// Returns the top-level nav route based on current pathname
export function useActiveRoute(): NavRoute | null {
  const pathname = usePathname();

  // Exact match for home
  if (pathname === '/') {
    return '/';
  }

  // Bridge/Swap routes
  if (pathname.startsWith('/bridge')) {
    return '/bridge';
  }

  // Explore routes: /projects, /chains, /bookmarks
  if (
    pathname.startsWith('/projects') ||
    pathname.startsWith('/chains') ||
    pathname.startsWith('/bookmarks')
  ) {
    return '/projects';
  }

  // Build routes: /learn, /community
  if (
    pathname.startsWith('/build') ||
    pathname.startsWith('/learn') ||
    pathname.startsWith('/community')
  ) {
    return '/build';
  }

  return null;
}
