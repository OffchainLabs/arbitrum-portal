import { ChevronLeftIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { PathnameEnum } from '@/bridge/constants';
import { useMode } from '@/bridge/hooks/useMode';

import { Button } from '../common/Button';

export function BackButton() {
  const { embedMode } = useMode();
  const searchParams = useSearchParams();

  return (
    <Link
      href={{
        pathname: embedMode ? PathnameEnum.EMBED_BUY : PathnameEnum.BUY,
        query: searchParams.toString(),
      }}
      className="flex flex-row justify-content items-center absolute top-4 left-4 gap-2 hover:opacity-80"
    >
      <Button
        variant="secondary"
        className="rounded-full w-6 h-6 flex items-center justify-center bg-white/20 backdrop-blur border-none hover:opacity-100 hover:bg-white/20 hover:text-white/70"
      >
        <ChevronLeftIcon className="h-3 w-3" />
      </Button>
      <span>Back</span>
    </Link>
  );
}
