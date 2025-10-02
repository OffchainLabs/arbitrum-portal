import { ArrowUpRightIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback } from 'react';
import { twMerge } from 'tailwind-merge';

import { ChainId } from '@/bridge/types/ChainId';
import MoonPay from '@/images/onramp/moonpay.svg';

import { Button } from '../common/Button';

const onrampServices = [
  {
    name: 'Transak',
    slug: 'transak',
    logo: '/images/onramp/transak.webp',
    link: 'https://global.transak.com',
    chains: [ChainId.Ethereum, ChainId.ArbitrumOne],
  },
  {
    name: 'Ramp',
    slug: 'ramp',
    logo: '/images/onramp/ramp.webp',
    link: 'https://ramp.network/buy',
    chains: [ChainId.Ethereum, ChainId.ArbitrumOne],
  },
  {
    name: 'Mt Pelerin',
    slug: 'mt-pelerin',
    logo: '/images/onramp/mt_pelerin.webp',
    link: 'https://www.mtpelerin.com/buy-crypto',
    chains: [ChainId.Ethereum, ChainId.ArbitrumOne],
  },
  {
    name: 'Coinbase Pay',
    slug: 'coinbase-pay',
    logo: '/images/onramp/coinbase.webp',
    link: 'https://login.coinbase.com/signin?client_id=258660e1-9cfe-4202-9eda-d3beedb3e118&oauth_challenge=851bae2a-c907-413d-9a12-71c1dfaa5d4f',
    chains: [ChainId.Ethereum, ChainId.ArbitrumOne],
  },
  {
    name: 'Onramp',
    slug: 'onramp',
    logo: '/images/onramp/onramp.webp',
    link: 'https://onramp.money',
    chains: [ChainId.Ethereum, ChainId.ArbitrumOne],
  },
  {
    name: 'Banxa',
    slug: 'banxa',
    logo: '/images/onramp/banxa.webp',
    link: 'https://checkout.banxa.com',
    chains: [ChainId.Ethereum, ChainId.ArbitrumOne],
  },
  {
    name: 'Simplex',
    slug: 'simplex',
    logo: '/images/onramp/simplex.webp',
    link: 'https://buy.simplex.com',
    chains: [ChainId.Ethereum],
  },
  {
    name: 'Kado',
    slug: 'kado',
    logo: '/images/onramp/kado.webp',
    link: 'https://swapped.com/',
    chains: [ChainId.Ethereum, ChainId.ArbitrumOne],
  },
  {
    name: 'Alchemy Pay',
    slug: 'alchemy-pay',
    logo: '/images/onramp/alchemy_pay.webp',
    link: 'https://ramp.alchemypay.org/#/index',
    chains: [ChainId.Ethereum, ChainId.ArbitrumOne],
  },
] as const;

function OnrampServiceTile({ name, logo }: { name: string; logo: string }) {
  const openDetails = useCallback(() => {}, []);

  return (
    <Button
      variant="tertiary"
      className={twMerge(
        'relative flex w-full flex-col items-center justify-center rounded-md bg-gray-neutral-100 p-4 last-of-type:col-span-2 md:last-of-type:col-span-1 overflow-hidden',
      )}
      onClick={() => openDetails()}
    >
      <span className="mx-auto flex h-8 w-8 items-center justify-center overflow-hidden rounded-md">
        <Image src={logo} alt={name} width={40} height={40} />
      </span>
      <p className="mt-2 text-lg">{name}</p>

      <span className="absolute right-3 top-3 rounded-full bg-white/10 p-[6px]">
        <ArrowUpRightIcon className="h-[12px] w-[12px] stroke-2" />
      </span>
    </Button>
  );
}

function MoonPayTile() {
  const pathname = usePathname();

  return (
    <Link
      href={`${pathname}/moonpay`}
      className={twMerge('relative col-span-2 flex h-full w-full flex-col md:col-span-3')}
    >
      <Button
        variant="tertiary"
        className={twMerge(
          'relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-md bg-gray-neutral-100 p-4 text-white',
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
  return (
    <div className={twMerge('grid gap-3', 'grid-cols-2 md:grid-cols-3')}>
      <MoonPayTile />
      {onrampServices.map((service) => (
        <OnrampServiceTile key={service.name} {...service} />
      ))}
    </div>
  );
}
