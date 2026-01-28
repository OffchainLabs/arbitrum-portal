import { PropsWithChildren } from 'react';

import { MobileHeader } from '@/portal/components/MobileHeader';
import { OrbitChainPanel } from '@/portal/components/OrbitChainPanel/OrbitChainPanel';
import { ProjectPanel } from '@/portal/components/ProjectPanel';

import '../../../styles/portal.css';

export default function PortalLayout({ children }: PropsWithChildren) {
  return (
    <div className="portal-wrapper">
      <MobileHeader />
      {/* Content wrapper - styles migrated from PortalPage */}
      <div className="relative mx-auto flex w-full max-w-[1153px] flex-col gap-4 px-6 pb-[160px] lg:gap-6">
        {children}
      </div>
      <OrbitChainPanel />
      <ProjectPanel />
    </div>
  );
}
