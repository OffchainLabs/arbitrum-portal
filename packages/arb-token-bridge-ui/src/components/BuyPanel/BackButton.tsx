'use client';

import { ChevronLeftIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { PathnameEnum } from '@/bridge/constants';
import { useMode } from '@/bridge/hooks/useMode';

export function BackButton() {
  const { embedMode } = useMode();
  const searchParams = useSearchParams();

  return (
    <Link
      href={{
        pathname: embedMode ? PathnameEnum.EMBED_BUY : PathnameEnum.BUY,
        query: searchParams.toString(),
      }}
      className="justify-content absolute top-4 left-4 flex flex-row items-center gap-2 hover:opacity-80"
    >
      <span className="flex h-6 w-6 items-center justify-center rounded-full border-none bg-white/20 backdrop-blur-sm hover:bg-white/20 hover:text-white/70 hover:opacity-100">
        <ChevronLeftIcon className="h-3 w-3" />
      </span>
      <span>Back</span>
    </Link>
  );
}
