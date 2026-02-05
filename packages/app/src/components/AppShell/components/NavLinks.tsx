'use client';

import Link from 'next/link';
import { twMerge } from 'tailwind-merge';

import { navLinks } from '../config/navConfig';
import { useActiveRoute } from '../hooks/useActiveRoute';

export function NavLinks() {
  const activeRoute = useActiveRoute();

  return (
    <div className="flex items-center gap-1.5 bg-neutral-25 rounded-md" style={{ height: '40px' }}>
      {navLinks.map((link) => {
        const isActive = activeRoute === link.route;

        return (
          <Link
            key={link.route}
            href={link.route}
            prefetch={true}
            className={twMerge(
              'rounded-md px-4 h-full text-sm text-white transition-colors flex items-center justify-center',
              isActive ? 'bg-white/10 text-white' : 'bg-transparent hover:opacity-50',
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}
