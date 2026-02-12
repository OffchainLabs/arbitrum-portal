'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { PropsWithChildren } from 'react';
import { twMerge } from 'tailwind-merge';

import { useSiteBannerVisible } from '@/bridge/components/common/SiteBanner';

import { Nav } from './components/Nav';
import { NavLinks } from './components/NavLinks';
import { SubNav } from './components/SubNav';

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

  if (isEmbedMode) {
    return <div className="flex flex-1 flex-col md:flex-row">{children}</div>;
  }

  const contentPaddingClasses = twMerge(
    'flex flex-1 flex-col md:flex-row',
    'pb-[theme(navbar.mobileBottom)] md:pb-0',
    !isBannerVisible && 'pt-[calc(theme(navbar.mobile)+theme(navbar.spacing))]',
    !isBannerVisible && 'md:pt-[calc(theme(navbar.desktop)+theme(navbar.spacing))]',
    isBannerVisible && 'pt-[calc(theme(navbar.mobile)+theme(navbar.bannerMobile)+theme(navbar.spacing))]',
    isBannerVisible && 'md:pt-[calc(theme(navbar.desktop)+theme(navbar.bannerDesktop)+theme(navbar.spacing))]',
  );

  return <div className={contentPaddingClasses}>{children}</div>;
}

export function AppShell({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const isEmbedMode = pathname.startsWith('/bridge/embed');

  return (
    <AppProviders>
      <div className="flex min-h-screen flex-col">
        {!isEmbedMode && (
          <>
            <Nav />
            <NavLinks />
          </>
        )}
        <AppShellPaddingWrapper isEmbedMode={isEmbedMode}>
          {!isEmbedMode && <SubNav />}
          <main className="flex-1">{children}</main>
        </AppShellPaddingWrapper>
      </div>
    </AppProviders>
  );
}
