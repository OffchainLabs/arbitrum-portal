import type { Metadata } from 'next';
import { PropsWithChildren } from 'react';
import { twMerge } from 'tailwind-merge';

import { unica } from '@/bridge/components/common/Font';
import { PORTAL_DOMAIN } from '@/bridge/constants';

import '../styles/common.css';

export const metadata: Metadata = {
  metadataBase: new URL(PORTAL_DOMAIN),
  icons: {
    icon: '/logo.png',
  },
};

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <body className={twMerge('relative bg-black text-white', unica.variable)}>{children}</body>
    </html>
  );
}
