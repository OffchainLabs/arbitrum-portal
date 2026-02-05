import { PropsWithChildren } from 'react';

import { OrbitChainPanel } from '@/portal/components/OrbitChainPanel/OrbitChainPanel';
import { ProjectPanel } from '@/portal/components/ProjectPanel';

export default function PortalLayout({ children }: PropsWithChildren) {
  return (
    <>
      <div className="relative mx-auto flex w-full max-w-[1153px] flex-col gap-4 px-4 lg:gap-6 mb-24">
        {children}
      </div>
      <OrbitChainPanel />
      <ProjectPanel />
    </>
  );
}
