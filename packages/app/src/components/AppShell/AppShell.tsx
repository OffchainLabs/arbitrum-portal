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

const contentPaddingClasses = twMerge(
  'flex flex-1 flex-col md:flex-row',
  'pt-[calc(theme(navbar.mobile)+theme(navbar.spacing))]',
  'data-[banner=true]:pt-[calc(theme(navbar.mobile)+theme(navbar.banner)+theme(navbar.spacing))]',
  'md:pt-[calc(theme(navbar.desktop)+theme(navbar.spacing))]',
  'data-[banner=true]:md:pt-[calc(theme(navbar.desktop)+theme(navbar.banner)+theme(navbar.spacing))]',
  'pb-[theme(navbar.mobileBottom)] md:pb-0',
);

function AppShellPaddingWrapper({ children, isEmbedMode }: AppShellPaddingWrapperProps) {
  const isBannerVisible = useSiteBannerVisible();

  if (isEmbedMode) {
    return <div className="flex flex-1 flex-col md:flex-row">{children}</div>;
  }

  return (
    <div className={contentPaddingClasses} data-banner={isBannerVisible ? 'true' : undefined}>
      {children}
    </div>
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
