import Image, { ImageProps } from 'next/image';
import Link from 'next/link';
import { twMerge } from 'tailwind-merge';

import ArbitrumLogo from '@/public/images/ArbitrumLogo.svg';

function HeaderImageElement({ ...props }: ImageProps) {
  return (
    <Image
      id="header-image"
      src={props.src}
      alt={props.alt || 'Arbitrum logo'}
      className={twMerge('-ml-2 h-[40px] w-[40px] lg:ml-0', props.className || '')}
    />
  );
}

export const MobileHeaderLogo = () => {
  return (
    <Link href="/" className="arb-hover flex flex-col items-center">
      <HeaderImageElement src={ArbitrumLogo} alt="Arbitrum logo" />
    </Link>
  );
};
