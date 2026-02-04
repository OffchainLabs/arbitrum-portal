import Link from 'next/link';
import { twMerge } from 'tailwind-merge';

import { navLinksWithIcons } from '../../config/navConfig';
import { useActiveRoute } from '../../hooks/useActiveRoute';

export function NavMobile() {
  const activeRoute = useActiveRoute();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 w-full items-center justify-around border-t border-gray-8 bg-black/80 backdrop-blur-sm md:hidden">
      {navLinksWithIcons.map((link) => {
        const isActive = activeRoute === link.route;
        const Icon = link.icon;

        return (
          <Link
            key={link.route}
            href={link.route}
            prefetch={true}
            className={twMerge(
              'flex flex-1 flex-col items-center justify-center gap-1.5 px-1 py-2 transition-all duration-200 min-h-[44px] touch-manipulation relative',
              isActive && 'rounded-xl mx-0.5',
            )}
          >
            {isActive && <div className="absolute inset-0 rounded-xl bg-gray-8/90 -z-10" />}

            <Icon
              className={twMerge(
                'h-5 w-5 shrink-0 transition-colors stroke-[1.5]',
                isActive ? 'text-white' : 'text-white/70',
              )}
            />

            <span
              className={twMerge(
                'text-[10px] leading-[12px] transition-colors tracking-tight',
                isActive ? 'font-semibold text-white' : 'font-normal text-white/70',
              )}
            >
              {link.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
