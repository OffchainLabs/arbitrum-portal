import { Metadata } from 'next';
import { PropsWithChildren } from 'react';
import 'react-toastify/dist/ReactToastify.css';

import { PORTAL_DOMAIN } from '@/bridge/constants';

import BridgeClient from './BridgeClient';

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
  // The bridge App is rendered here in the layout (which persists across the
  // /bridge sub-routes) rather than per-page, so navigating between /bridge,
  // /bridge/tx-history and /bridge/buy swaps only the inner panel via
  // MainContent (keyed off pathname) instead of remounting the entire App.
  // The pages themselves only run initializeBridgePage and render nothing.
  return (
    <main className="relative flex h-full flex-1 flex-col overflow-y-auto">
      <BridgeClient />
      {children}
    </main>
  );
}
