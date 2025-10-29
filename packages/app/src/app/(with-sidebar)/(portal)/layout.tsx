'use client';

import '@rainbow-me/rainbowkit/styles.css';
import { AppProviders } from 'arb-token-bridge-ui/src/components/App/AppProviders';
import { PropsWithChildren } from 'react';

import { MobileHeader } from '@/portal/components/MobileHeader';
import { OrbitChainPanel } from '@/portal/components/OrbitChainPanel/OrbitChainPanel';
import { PortalPage } from '@/portal/components/PortalPage/PortalPage';
import { ProjectPanel } from '@/portal/components/ProjectPanel';
import { Providers } from '@/portal/components/Providers';

import '../../../styles/portal.css';

export default function PortalLayout({ children }: PropsWithChildren) {
  return (
    <div className="portal-wrapper">
      <AppProviders>
        <Providers>
          <MobileHeader />
          <PortalPage>{children}</PortalPage>
          <OrbitChainPanel />
          <ProjectPanel />
        </Providers>
      </AppProviders>
    </div>
  );
}
