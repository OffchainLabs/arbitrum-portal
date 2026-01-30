import { PropsWithChildren } from 'react';

import { SiteBanner } from '@/bridge/components/common/SiteBanner';
import { Toast } from '@/bridge/components/common/atoms/Toast';

import { AppShell } from '@/app-components/AppShell';

export default function WithSidebarLayout({ children }: PropsWithChildren) {
  return (
    <AppShell>
      <SiteBanner />
      {children}
      <Toast />
    </AppShell>
  );
}
