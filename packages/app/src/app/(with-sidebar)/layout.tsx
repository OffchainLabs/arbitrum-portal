import { PropsWithChildren } from 'react';

import { AppShell } from '@/app-components/AppShell';
import { SiteBanner } from '@/bridge/components/common/SiteBanner';
import { Toast } from '@/bridge/components/common/atoms/Toast';

export default function WithSidebarLayout({ children }: PropsWithChildren) {
  return (
    <AppShell>
      <SiteBanner />
      {children}
      <Toast />
    </AppShell>
  );
}
