'use client';

import { PropsWithChildren } from 'react';

import { MasterNavbar } from './components/MasterNavbar';

// ArbitrumNavigation - Main frame component that wraps the entire app
// Phase 1: Basic structure with MasterNavbar and children

export function ArbitrumNavigation({ children }: PropsWithChildren) {
  return (
    <div className="flex min-h-screen flex-col">
      <MasterNavbar />
      <main className="flex-1">{children}</main>
    </div>
  );
}
