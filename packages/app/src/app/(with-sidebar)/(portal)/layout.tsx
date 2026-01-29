import { PropsWithChildren } from 'react';

import { OrbitChainPanel } from '@/portal/components/OrbitChainPanel/OrbitChainPanel';
import { PortalPage } from '@/portal/components/PortalPage/PortalPage';
import { ProjectPanel } from '@/portal/components/ProjectPanel';

export default function PortalLayout({ children }: PropsWithChildren) {
  return (
    <>
      <PortalPage>{children}</PortalPage>
      <OrbitChainPanel />
      <ProjectPanel />
    </>
  );
}
