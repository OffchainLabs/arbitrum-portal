'use client';

import { usePathname } from 'next/navigation';
import { PropsWithChildren } from 'react';

import { MasterNavbar } from './components/MasterNavbar';
import { SideNav } from './components/SideNav';
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
        <div className="flex flex-1">
          {!isEmbedMode && <SideNav />}
          {/* Main content area with padding to account for fixed navbars */}
          <main className={`flex-1 ${!isEmbedMode ? 'pt-14 pl-16' : ''}`}>
            {children}
          </main>
        </div>
      </div>
    </NavigationProviders>
  );
}
