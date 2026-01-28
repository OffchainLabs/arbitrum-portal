'use client';

import Link from 'next/link';
import { twMerge } from 'tailwind-merge';

import { useActiveRoute } from '../hooks/useActiveRoute';
import type { NavLink } from '../types';

const navLinks: NavLink[] = [
  { label: 'Home', route: '/' },
  { label: 'Bridge', route: '/bridge' },
  { label: 'Explore', route: '/projects' },
  { label: 'Build', route: '/build' },
];

// NavLinks component - Navigation links (Home, Bridge, Explore, Build)
export function NavLinks() {
  const activeRoute = useActiveRoute();

  return (
    <div className="flex items-center gap-2">
      {navLinks.map((link) => {
        const isActive = activeRoute === link.route;

        return (
          <Link
            key={link.route}
            href={link.route}
            className={twMerge(
              'rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors',
              isActive
                ? 'bg-gray-8' // Darker grey for active state (matching Figma)
                : 'bg-transparent hover:bg-gray-8/50', // Transparent with hover for inactive
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}
