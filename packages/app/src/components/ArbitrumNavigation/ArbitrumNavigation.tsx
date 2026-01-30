'use client';

import { usePathname } from 'next/navigation';
import { PropsWithChildren } from 'react';
import { twMerge } from 'tailwind-merge';

import { MasterNavbar } from './components/MasterNavbar';
import { SideNav } from './components/SideNav';
import { BottomNav } from './components/mobile/BottomNav';
import { MasterNavbarMobile } from './components/mobile/MasterNavbarMobile';
import { SideNavMobile } from './components/mobile/SideNavMobile';
import { NavigationProviders } from './providers/NavigationProviders';

// ArbitrumNavigation - Main frame component that wraps the entire app
// Includes providers and navigation UI
// Hides navigation UI in embed mode but keeps providers
// Conditionally renders desktop or mobile navigation based on screen size

export function ArbitrumNavigation({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const isEmbedMode = pathname.startsWith('/bridge/embed');

  return (
    <NavigationProviders>
      <div className="flex min-h-screen flex-col">
        {!isEmbedMode && (
          <>
            {/* Desktop Navigation */}
            <div className="hidden md:block">
              <MasterNavbar />
            </div>
            {/* Mobile Navigation */}
            <div className="md:hidden">
              <MasterNavbarMobile />
            </div>
          </>
        )}
        <div
          className={(twMerge('flex flex-1 flex-col md:flex-row'), isEmbedMode ? '' : 'md:pt-[100px]')}
        >
          {!isEmbedMode && (
            <>
              {/* Desktop Side Nav */}
              <div className="hidden md:block">
                <SideNav />
              </div>
              {/* Mobile Side Nav (tabs) */}
              <div className="md:hidden pt-[66px]">
                <SideNavMobile />
              </div>
            </>
          )}
          {/* Main content area with padding to account for fixed navbars */}
          {/* Desktop: pt-[66px] for top navbar */}
          {/* Mobile: pt-14 (56px) for MasterNavbarMobile + pt-14 (56px) when SideNavMobile exists = pt-28 (112px) total + pb-16 (64px) for bottom nav */}
          <main className="flex-1">{children}</main>
        </div>
        {/* Mobile Bottom Nav */}
        {!isEmbedMode && (
          <div className="md:hidden">
            <BottomNav />
          </div>
        )}
      </div>
    </NavigationProviders>
  );
}
