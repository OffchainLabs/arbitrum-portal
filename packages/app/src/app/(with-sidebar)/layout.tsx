import { PropsWithChildren, Suspense } from 'react';

import { SiteBanner } from '@/bridge/components/common/SiteBanner';
import { Toast } from '@/bridge/components/common/atoms/Toast';
import { AppSidebar } from '@/portal/components/AppSidebar';

import Background from '../../components/Background';

export default function WithSidebarLayout({ children }: PropsWithChildren) {
  return (
    <>
      <Background />

      <div className="relative flex">
        <Suspense>
          <AppSidebar />
        </Suspense>

        <div className="relative flex w-full flex-col">
          <SiteBanner />

          {children}
        </div>

        <Toast />
      </div>
    </>
  );
}
