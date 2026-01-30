'use client';

import Link from 'next/link';
import { twMerge } from 'tailwind-merge';

import { masterNavLinks } from '../config/navConfig';
import { useActiveRoute } from '../hooks/useActiveRoute';

export function NavLinks() {
  const activeRoute = useActiveRoute();

  return (
    <div className="flex items-center gap-2 bg-gray-8/50 rounded-md h-[40px]">
      {masterNavLinks.map((link) => {
        const isActive = activeRoute === link.route;

        return (
          <Link
            key={link.route}
            href={link.route}
            prefetch={true}
            className={twMerge(
              'rounded-md px-4 h-full text-sm transition-colors flex items-center justify-center',
              isActive
                ? 'bg-white/10 text-white'
                : 'bg-transparent text-white/70 hover:bg-gray-8/50 hover:text-white',
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}
