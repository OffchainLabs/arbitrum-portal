import { ArrowUpRightIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import { twMerge } from 'tailwind-merge';

import { trackEvent } from '@/bridge/util/AnalyticsUtils';
import MoonPay from '@/images/onramp/moonpay.svg';

import { Button } from '../common/Button';
import { onrampServices } from './utils';

function OnrampServiceTile({ name, logo, slug }: { name: string; logo: string; slug: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <Link
      href={{ pathname: `${pathname}/${slug}`, query: searchParams.toString() }}
      className="relative col-span-1 flex h-full w-full last-of-type:col-span-2 md:last-of-type:col-span-1 flex-col items-center justify-center rounded-md bg-white/5 p-4 overflow-hidden hover:opacity-80"
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

function MoonPayTile() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <Link
      href={{ pathname: `${pathname}/moonpay`, query: searchParams.toString() }}
      className={twMerge(
        'relative col-span-2 flex h-full w-full flex-col md:col-span-3 items-center justify-center overflow-hidden rounded-md bg-white/5 p-4 text-white hover:opacity-80',
      )}
      onClick={() => {
        trackEvent('Onramp Service Click', { service: 'MoonPay' });
      }}
    >
      <div className="absolute left-0 top-0 h-[190px] w-full bg-[url('/images/gray_square_background.svg')] rounded-md moonpay-ellipse"></div>
      <div className="relative flex flex-col items-center justify-center">
        <Image src={MoonPay} alt="MoonPay" width={50} height={50} />
        <p className="mt-2 text-lg">MoonPay</p>
        <p className="mt-1 text-xs text-white/60">Pay using PayPal, Apple Pay & more</p>
      </div>
      <span className="mt-2 py-2 relative w-[200px] bg-white/10 rounded-lg text-sm text-white flex items-center justify-center">
        Buy now
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
      <MoonPayTile />
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
