import '@rainbow-me/rainbowkit/styles.css';
import { Metadata } from 'next';
import { PropsWithChildren } from 'react';
import 'react-toastify/dist/ReactToastify.css';
import 'tippy.js/dist/tippy.css';
import 'tippy.js/themes/light.css';

import { PORTAL_DOMAIN } from '@/bridge/constants';

export const metadata: Metadata = {
  metadataBase: new URL(PORTAL_DOMAIN),
  icons: {
    icon: '/logo.png',
  },
};

/** CSS imported in layout are imported only once
 * They would be imported multiple times if imported in page.tsx
 */
export default function BridgeLayout({ children }: PropsWithChildren) {
  return <>{children}</>;
}
