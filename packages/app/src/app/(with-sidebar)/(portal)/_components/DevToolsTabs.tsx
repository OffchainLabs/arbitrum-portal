'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { twMerge } from 'tailwind-merge';

import { PageHeading } from '@/app-components/AppShell/components/PageHeading';

const tabs = [
  { href: '/learn', label: 'Learn', pathMatch: '/learn' },
  { href: '/build', label: 'Build & Monitor', pathMatch: '/build' },
] as const;

export function DevToolsTabs() {
  const pathname = usePathname();

  const isActive = (pathMatch: string) => pathname.startsWith(pathMatch);

  return (
    <div className="flex flex-col gap-4">
      <PageHeading>Dev-Tools</PageHeading>

      {/* Mobile */}
      <div className="flex items-center w-full md:hidden py-4">
        {tabs.map((tab) => {
          const active = isActive(tab.pathMatch);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={twMerge(
                'flex-1 flex-shrink-0 text-sm transition-colors pb-2 border-b-2 touch-manipulation',
                active
                  ? 'text-white border-white font-semibold'
                  : 'text-white/70 border-b border-white/30',
              )}
            >
              <div className="text-center">{tab.label}</div>
            </Link>
          );
        })}
      </div>

      {/* Desktop */}
      <div className="hidden md:flex gap-2">
        {tabs.map((tab) => {
          const active = isActive(tab.pathMatch);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={twMerge(
                'rounded-sm px-4 py-2 text-sm transition-colors',
                active
                  ? 'bg-gradient-to-b from-white/20 to-white/30 text-white'
                  : 'text-white/70 hover:bg-default-black bg-default-black/70 hover:text-white',
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
