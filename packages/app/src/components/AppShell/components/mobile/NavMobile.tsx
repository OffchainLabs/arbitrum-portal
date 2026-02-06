'use client';

import Image from 'next/image';
import Link from 'next/link';
import { twMerge } from 'tailwind-merge';

import { navLinksWithIcons } from '../../config/navConfig';
import { useActiveRoute } from '../../hooks/useActiveRoute';

export function NavMobile() {
  const activeRoute = useActiveRoute();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-[90px] p-2 w-full items-center justify-around bg-black/80 backdrop-blur-sm md:hidden">
      {navLinksWithIcons.map((link) => {
        const isActive = activeRoute === link.route;

        return (
          <Link
            key={link.route}
            href={link.route}
            prefetch={true}
            className="flex flex-1 flex-col items-center rounded justify-center gap-2 transition-all duration-200 h-full touch-manipulation relative"
          >
            {isActive && (
              <div
                className="absolute inset-0 rounded-[10px] -z-10"
                style={{
                  background:
                    'radial-gradient(ellipse at center bottom, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 70%), rgba(255,255,255,0.1)',
                }}
              />
            )}

            <Image
              src={link.imgSrc}
              alt={link.label}
              width={32}
              height={32}
              className={twMerge(
                'h-8 w-8 shrink-0 transition-colors stroke-2',
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
