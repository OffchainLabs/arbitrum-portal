import type { Metadata } from 'next';
import type { CSSProperties, PropsWithChildren } from 'react';
import 'tippy.js/dist/tippy.css';
import 'tippy.js/themes/light.css';

import { unica } from '@/bridge/components/common/Font';
import { PORTAL_DOMAIN } from '@/bridge/constants';

import '../styles/common.css';

export const metadata: Metadata = {
  metadataBase: new URL(PORTAL_DOMAIN),
  icons: {
    icon: '/logo.png',
  },
};

const reownFontVariables = {
  '--apkt-fontFamily-regular': `${unica.style.fontFamily}, Roboto, sans-serif`,
  '--apkt-fontFamily-mono': `${unica.style.fontFamily}, Roboto, sans-serif`,
} as CSSProperties;

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang="en" className={unica.variable} style={reownFontVariables}>
      <body className="relative bg-black text-white">{children}</body>
    </html>
  );
}
