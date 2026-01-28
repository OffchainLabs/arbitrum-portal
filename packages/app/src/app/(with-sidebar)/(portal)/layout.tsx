import { PropsWithChildren } from 'react';

import { MobileHeader } from '@/portal/components/MobileHeader';
import { OrbitChainPanel } from '@/portal/components/OrbitChainPanel/OrbitChainPanel';
import { ProjectPanel } from '@/portal/components/ProjectPanel';
import { PortalPage } from '@/portal/components/PortalPage/PortalPage';

export default function PortalLayout({ children }: PropsWithChildren) {
  return (
    <>
      <MobileHeader />
      <PortalPage>{children}</PortalPage>
      <OrbitChainPanel />
      <ProjectPanel />
    </>
  );
}
