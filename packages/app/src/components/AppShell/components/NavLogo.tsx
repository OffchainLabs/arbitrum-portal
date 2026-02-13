import Image from 'next/image';
import Link from 'next/link';

// NavLogo component - Arbitrum logo with link to home
export function NavLogo() {
  return (
    <Link
      href="/"
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-neutral-25 transition-opacity hover:opacity-80"
    >
      <Image
        src="/images/ArbitrumLogo.svg"
        alt="Arbitrum"
        width={24}
        height={24}
        className="h-6 w-6"
        priority
      />
    </Link>
  );
}
