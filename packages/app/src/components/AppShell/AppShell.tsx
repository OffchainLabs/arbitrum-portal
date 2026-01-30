'use client';

import { usePathname } from 'next/navigation';
import { PropsWithChildren } from 'react';
import { twMerge } from 'tailwind-merge';

import { MasterNavbar } from './components/MasterNavbar';
import { SideNav } from './components/SideNav';
import { BottomNav } from './components/mobile/BottomNav';
import { MasterNavbarMobile } from './components/mobile/MasterNavbarMobile';
import { SideNavMobile } from './components/mobile/SideNavMobile';
import { AppProviders } from './providers/AppProviders';

// AppShell - Main app shell component that wraps the entire application
// Includes app-level providers and navigation UI
// Hides navigation UI in embed mode but keeps providers
// Conditionally renders desktop or mobile navigation based on screen size

export function AppShell({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const isEmbedMode = pathname.startsWith('/bridge/embed');

  return (
    <AppProviders>
      <div className="flex min-h-screen flex-col">
        {!isEmbedMode && (
          <>
            <div className="hidden md:block">
              <MasterNavbar />
            </div>
            <div className="md:hidden">
              <MasterNavbarMobile />
            </div>
          </>
        )}
        <div
          className={twMerge(
            'flex flex-1 flex-col md:flex-row',
            !isEmbedMode && 'md:pt-[100px]',
          )}
        >
          {!isEmbedMode && (
            <>
              <div className="hidden md:block">
                <SideNav />
              </div>
              <div className="md:hidden pt-[66px]">
                <SideNavMobile />
              </div>
            </>
          )}
          <main className="flex-1">{children}</main>
        </div>
        {!isEmbedMode && (
          <div className="md:hidden">
            <BottomNav />
          </div>
        )}
      </div>
    </AppProviders>
  );
}
