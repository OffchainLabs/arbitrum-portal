import { PropsWithChildren } from 'react';

import { SiteBanner } from '@/bridge/components/common/SiteBanner';
import { Toast } from '@/bridge/components/common/atoms/Toast';

import { ArbitrumNavigation } from '../../components/ArbitrumNavigation';

export default function WithSidebarLayout({ children }: PropsWithChildren) {
  return (
    <ArbitrumNavigation>
      <SiteBanner />
      {children}
      <Toast />
    </ArbitrumNavigation>
  );
}
