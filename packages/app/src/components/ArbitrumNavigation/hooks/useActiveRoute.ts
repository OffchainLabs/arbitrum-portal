'use client';

import { usePathname } from 'next/navigation';

import type { NavRoute } from '../types';

// Hook for detecting active route
export function useActiveRoute(): NavRoute | null {
  const pathname = usePathname();

  // Exact match for home
  if (pathname === '/') {
    return '/';
  }

  // Prefix matches for other routes
  if (pathname.startsWith('/bridge')) {
    return '/bridge';
  }

  if (pathname.startsWith('/projects')) {
    return '/projects';
  }

  if (pathname.startsWith('/build')) {
    return '/build';
  }

  return null;
}
