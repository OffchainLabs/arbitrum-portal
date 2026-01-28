'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { twMerge } from 'tailwind-merge';

export function DevToolsTabs() {
  const pathname = usePathname();
  const isLearnPage = pathname.startsWith('/learn');
  const isBuildPage = pathname.startsWith('/build');

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-bold text-white">Dev-Tools</h1>
      <div className="flex gap-2">
        <Link
          href="/build"
          className={twMerge(
            'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
            isBuildPage
              ? 'bg-gray-8 text-white'
              : 'text-white/70 hover:bg-gray-8/50 hover:text-white',
          )}
        >
          Build & Monitor
        </Link>

        <Link
          href="/learn"
          className={twMerge(
            'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
            isLearnPage
              ? 'bg-gray-8 text-white'
              : 'text-white/70 hover:bg-gray-8/50 hover:text-white',
          )}
        >
          Learn
        </Link>
      </div>
    </div>
  );
}
