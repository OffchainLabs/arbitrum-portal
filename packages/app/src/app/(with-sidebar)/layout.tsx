import { BellAlertIcon } from '@heroicons/react/24/outline';
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
          <SiteBanner>
            <div className="text-center">
              <BellAlertIcon className="mr-[5px] inline-block h-[20px] w-[20px] text-white" />
              <p className="inline text-sm">
                <strong>URL Update:</strong> The official Arbitrum Bridge has moved from{' '}
                <span className="mr-[3px] inline-block italic underline">bridge.arbitrum.io</span>{' '}
                to <span className="italic underline">portal.arbitrum.io/bridge</span>
              </p>
            </div>
          </SiteBanner>

          {children}
        </div>

        <Toast />
      </div>
    </>
  );
}
