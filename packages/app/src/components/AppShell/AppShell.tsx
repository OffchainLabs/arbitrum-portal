'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { PropsWithChildren } from 'react';
import { twMerge } from 'tailwind-merge';

import { useSiteBannerVisible } from '@/bridge/components/common/SiteBanner';

import { Nav } from './components/Nav';
import { SubNav } from './components/SubNav';
import { NavHeaderMobile } from './components/mobile/NavHeaderMobile';
import { NavMobile } from './components/mobile/NavMobile';
import { SubNavMobile } from './components/mobile/SubNavMobile';
import { getDesktopContentPadding, getMobileContentPadding } from './config/navConfig';

const AppProviders = dynamic(
  () => import('./providers/AppProviders').then((mod) => mod.AppProviders),
  {
    ssr: false, // use-query-params provider doesn't support SSR
  },
);

export function AppShell({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const isEmbedMode = pathname.startsWith('/bridge/embed');
  const isBannerVisible = useSiteBannerVisible({});

  const desktopPaddingTop = getDesktopContentPadding(isBannerVisible);
  const mobilePaddingTop = getMobileContentPadding(isBannerVisible);

  return (
    <AppProviders>
      <div className="flex min-h-screen flex-col">
        {!isEmbedMode && (
          <>
            <div className="hidden md:block">
              <Nav />
            </div>
            <div className="md:hidden">
              <NavHeaderMobile />
            </div>
          </>
        )}
        <div
          className={twMerge(
            'flex flex-1 flex-col md:flex-row',
            !isEmbedMode && desktopPaddingTop,
            !isEmbedMode && mobilePaddingTop,
          )}
        >
          {!isEmbedMode && (
            <>
              <div className="hidden md:block">
                <SubNav />
              </div>
              <div className="md:hidden">
                <SubNavMobile />
              </div>
            </>
          )}
          <main className="flex-1">{children}</main>
        </div>
        {!isEmbedMode && (
          <div className="md:hidden">
            <NavMobile />
          </div>
        )}
      </div>
    </AppProviders>
  );
}
