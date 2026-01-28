'use client';

import { PropsWithChildren } from 'react';

import { MasterNavbar } from './components/MasterNavbar';
import { NavigationProviders } from './providers/NavigationProviders';

// ArbitrumNavigation - Main frame component that wraps the entire app
// Includes providers and navigation UI

export function ArbitrumNavigation({ children }: PropsWithChildren) {
  return (
    <NavigationProviders>
      <div className="flex min-h-screen flex-col">
        <MasterNavbar />
        <main className="flex-1">{children}</main>
      </div>
    </NavigationProviders>
  );
}
