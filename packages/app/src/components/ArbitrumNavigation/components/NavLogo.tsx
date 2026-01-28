'use client';

import Link from 'next/link';

// NavLogo component - Arbitrum logo with link to home
export function NavLogo() {
  return (
    <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
      <span className="text-white font-semibold">Logo</span>
    </Link>
  );
}
