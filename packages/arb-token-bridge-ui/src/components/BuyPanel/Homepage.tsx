import { ArrowUpRightIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import { twMerge } from 'tailwind-merge';

import { trackEvent } from '@/bridge/util/AnalyticsUtils';

import { Button } from '../common/Button';
import { onrampServices } from './utils';

function OnrampServiceTile({ name, logo, slug }: { name: string; logo: string; slug: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <Link
      href={{ pathname: `${pathname}/${slug}`, query: searchParams.toString() }}
      className="relative col-span-1 flex h-full w-full flex-col items-center justify-center rounded-md bg-white/5 p-4 overflow-hidden hover:opacity-80"
      onClick={() => {
        trackEvent('Onramp Service Click', { service: name });
      }}
    >
      <span className="mx-auto flex h-8 w-8 items-center justify-center overflow-hidden rounded-md">
        <Image src={logo} alt={name} width={40} height={40} />
      </span>
      <p className="mt-2 text-lg">{name}</p>

      <span className="absolute right-3 top-3 rounded-full bg-white/10 p-[6px]">
        <ArrowUpRightIcon className="h-[12px] w-[12px] stroke-2" />
      </span>
    </Link>
  );
}

export function Homepage() {
  const router = useRouter();

  const allOnrampOnClick = useCallback(() => {
    router.push('/projects?subcategories=fiat-on-ramp');
  }, [router]);

  return (
    <div className={twMerge('grid gap-3', 'grid-cols-2 md:grid-cols-3')}>
      {onrampServices.map((service) => (
        <OnrampServiceTile key={service.name} {...service} />
      ))}
      <Button
        variant="tertiary"
        showArrow
        className="col-span-2 md:col-span-3 mx-auto text-lg"
        onClick={allOnrampOnClick}
      >
        See all on-ramps
      </Button>
    </div>
  );
}
