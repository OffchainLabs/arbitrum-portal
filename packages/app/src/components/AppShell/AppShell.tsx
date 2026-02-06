'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { PropsWithChildren } from 'react';

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

interface AppShellPaddingWrapperProps extends PropsWithChildren {
  isEmbedMode: boolean;
}

function AppShellPaddingWrapper({ children, isEmbedMode }: AppShellPaddingWrapperProps) {
  const isBannerVisible = useSiteBannerVisible();
  const desktopPaddingTop = getDesktopContentPadding(isBannerVisible);
  const mobilePaddingTop = getMobileContentPadding(isBannerVisible);
  const mobilePaddingBottom = getMobileContentBottomPadding();

  if (isEmbedMode) {
    return <div className="flex flex-1 flex-col md:flex-row">{children}</div>;
  }

  return (
    <>
      {/* Mobile wrapper */}
      <div
        className="flex flex-1 flex-col md:hidden"
        style={{
          paddingTop: `${mobilePaddingTop}px`,
          paddingBottom: `${mobilePaddingBottom}px`,
        }}
      >
        {children}
      </div>

      {/* Desktop wrapper */}
      <div
        className="hidden md:flex flex-1 flex-col md:flex-row"
        style={{
          paddingTop: `${desktopPaddingTop}px`,
        }}
      >
        {children}
      </div>
    </>
  );
}

export function AppShell({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const isEmbedMode = pathname.startsWith('/bridge/embed');

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
        <AppShellPaddingWrapper isEmbedMode={isEmbedMode}>
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
        </AppShellPaddingWrapper>
        {!isEmbedMode && (
          <div className="md:hidden">
            <NavMobile />
          </div>
        )}
      </div>
    </AppProviders>
  );
}
