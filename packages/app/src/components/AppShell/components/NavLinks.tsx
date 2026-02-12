'use client';

import Link from 'next/link';
import { twMerge } from 'tailwind-merge';

import Image from 'next/image';

import { navLinksWithIcons } from '../config/navConfig';
import { useActiveRoute } from '../hooks/useActiveRoute';

export function NavLinks() {
  const activeRoute = useActiveRoute();

  return (
    <div
      className={twMerge(
        'fixed bottom-0 left-0 right-0 z-50 flex h-[90px] p-2 w-full items-center justify-around bg-black/80 backdrop-blur-sm',
        'gap-1.5 md:bg-neutral-25 rounded-md',
        'md:top-3 md:left-1/2 md:-translate-x-1/2 md:w-fit md:h-10 md:p-0 md:justify-normal',
      )}
    >
      {navLinksWithIcons.map((link) => {
        const isActive = activeRoute === link.route;

        return (
          <Link
            key={link.route}
            href={link.href}
            prefetch={true}
            className={twMerge(
              'rounded-md px-4 h-full text-sm text-white transition-colors flex items-center justify-center',
              isActive ? 'bg-white/10 text-white' : 'bg-transparent hover:opacity-50',
            )}
          >
            {isActive && (
              <div
                className="absolute inset-0 rounded-[10px] -z-10 md:hidden"
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
                'h-8 w-8 shrink-0 transition-colors stroke-2 text-white',
                isActive ? 'text-white' : 'text-white/70',
                'md:hidden',
              )}
            />

            <span
              className={twMerge(
                'text-[10px] leading-[12px] transition-colors tracking-tight text-white',
                'md:text-sm',
              )}
            >
              {link.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
