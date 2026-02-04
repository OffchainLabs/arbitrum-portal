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
import {
  getDesktopContentPadding,
  getMobileContentBottomPadding,
  getMobileContentPadding,
} from './config/navConfig';

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
  const mobilePaddingBottom = getMobileContentBottomPadding();

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
          className="flex flex-1 flex-col md:flex-row"
          data-content-wrapper="true"
          style={
            !isEmbedMode
              ? {
                  paddingTop: `${mobilePaddingTop}px`,
                  paddingBottom: `${mobilePaddingBottom}px`,
                  ['--desktop-padding-top' as string]: `${desktopPaddingTop}px`,
                  ['--mobile-padding-bottom' as string]: `${mobilePaddingBottom}px`,
                }
              : undefined
          }
        >
          {!isEmbedMode && (
            <style
              dangerouslySetInnerHTML={{
                __html: `
                @media (min-width: 768px) {
                  [data-content-wrapper="true"] {
                    padding-top: var(--desktop-padding-top) !important;
                    padding-bottom: 0 !important;
                  }
                }
                @media (max-width: 767px) {
                  [data-content-wrapper="true"] {
                    padding-bottom: var(--mobile-padding-bottom) !important;
                  }
                }
              `,
              }}
            />
          )}
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
