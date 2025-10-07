import { PropsWithChildren } from 'react';

import { MobileHeader } from '@/portal/components/MobileHeader';
import { OrbitChainPanel } from '@/portal/components/OrbitChainPanel/OrbitChainPanel';
import { PortalPage } from '@/portal/components/PortalPage/PortalPage';
import { ProjectPanel } from '@/portal/components/ProjectPanel';
import { Providers } from '@/portal/components/Providers';

export default function PortalLayout({ children }: PropsWithChildren) {
  return (
    <Providers>
      <MobileHeader />
      <PortalPage>{children}</PortalPage>
      <OrbitChainPanel />
      <ProjectPanel />
    </Providers>
  );
}
