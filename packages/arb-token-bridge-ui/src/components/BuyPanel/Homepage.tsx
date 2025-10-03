import { ArrowUpRightIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import { twMerge } from 'tailwind-merge';

import MoonPay from '@/images/onramp/moonpay.svg';

import { Button } from '../common/Button';
import { onrampServices } from './utils';

function OnrampServiceTile({ name, logo, slug }: { name: string; logo: string; slug: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <Link
      href={{ pathname: `${pathname}/${slug}`, query: searchParams.toString() }}
      className="relative col-span-1 flex h-full w-full last-of-type:col-span-2 md:last-of-type:col-span-1"
    >
      <Button
        variant="tertiary"
        className={twMerge(
          'relative flex w-full flex-col items-center justify-center rounded-md bg-gray-9 p-4 overflow-hidden',
        )}
        onClick={() => {}}
      >
        <span className="mx-auto flex h-8 w-8 items-center justify-center overflow-hidden rounded-md">
          <Image src={logo} alt={name} width={40} height={40} />
        </span>
        <p className="mt-2 text-lg">{name}</p>

        <span className="absolute right-3 top-3 rounded-full bg-white/10 p-[6px]">
          <ArrowUpRightIcon className="h-[12px] w-[12px] stroke-2" />
        </span>
      </Button>
    </Link>
  );
}

function MoonPayTile() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <Link
      href={{ pathname: `${pathname}/moonpay`, query: searchParams.toString() }}
      className={twMerge('relative col-span-2 flex h-full w-full flex-col md:col-span-3')}
    >
      <Button
        variant="tertiary"
        className={twMerge(
          'relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-md bg-gray-9 p-4 text-white',
        )}
      >
        <div className="absolute left-0 top-0 h-[120px] w-full bg-[url('/images/gray_square_background.svg')] rounded-md"></div>
        <div className="absolute left-1/2 top-[40px] h-[282px] w-[602px] shrink-0 -translate-x-1/2 bg-eclipse"></div>
        <div className="relative flex flex-col items-center justify-center">
          <Image src={MoonPay} alt="MoonPay" width={50} height={50} />
          <p className="mt-2 text-lg">MoonPay</p>
          <p className="mt-1 text-sm">PayPal, Debit Card, Apple Pay</p>
        </div>
      </Button>
    </Link>
  );
}

export function Homepage() {
  const router = useRouter();

  const allOnrampOnClick = useCallback(() => {
    router.push(
      '/projects?chains=arbitrum-one_arbitrum-nova_apechain_cheese_degen_ebi-xyz_pop-apex_reya_sanko_xai_xchain&subcategories=fiat-on-ramp',
    );
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
