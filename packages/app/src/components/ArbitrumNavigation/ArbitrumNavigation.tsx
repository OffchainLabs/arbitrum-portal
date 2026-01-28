'use client';

import { usePathname } from 'next/navigation';
import { PropsWithChildren } from 'react';

import { MasterNavbar } from './components/MasterNavbar';
import { NavigationProviders } from './providers/NavigationProviders';

// ArbitrumNavigation - Main frame component that wraps the entire app
// Includes providers and navigation UI
// Hides navigation UI in embed mode but keeps providers

export function ArbitrumNavigation({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const isEmbedMode = pathname.startsWith('/bridge/embed');

  return (
    <NavigationProviders>
      <div className="flex min-h-screen flex-col">
        {!isEmbedMode && <MasterNavbar />}
        <main className="flex-1">{children}</main>
      </div>
    </NavigationProviders>
  );
}
