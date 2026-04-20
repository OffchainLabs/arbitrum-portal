'use client';

import dynamic from 'next/dynamic';
import { ComponentType } from 'react';

import { Loader } from '@/bridge/components/common/atoms/Loader';
import { isE2eTestingEnvironment, isProductionEnvironment } from '@/bridge/util/CommonUtils';
import { initializeSentry } from '@/bridge/util/SentryUtils';
import { registerLocalNetwork } from '@/bridge/util/networks';

import { addOrbitChainsToArbitrumSDK } from '../../../initialization';

// Initialize Sentry for error tracking
initializeSentry(process.env.NEXT_PUBLIC_SENTRY_DSN);

const App = dynamic(
  () => {
    return new Promise<{ default: ComponentType }>(async (resolve) => {
      if (!isProductionEnvironment || isE2eTestingEnvironment) {
        await registerLocalNetwork();
      }

      addOrbitChainsToArbitrumSDK();
      const AppComponent = await import('@/bridge/components/App/App');
      resolve(AppComponent);
    });
  },
  {
    loading: () => (
      <div className="bg-black-500 flex h-screen w-full items-center justify-center">
        <div className="h-12 w-full lg:h-16" />
        <div className="fixed inset-0 m-auto h-[44px] w-[44px]">
          <Loader size="large" color="white" />
        </div>
      </div>
    ),
  },
);

export default function Index() {
  return <App />;
}
