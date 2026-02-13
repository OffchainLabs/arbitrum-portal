import { PropsWithChildren } from 'react';

import { AppShell } from '@/app-components/AppShell/AppShell';
import { Toast } from '@/bridge/components/common/atoms/Toast';

export default function WithSidebarLayout({ children }: PropsWithChildren) {
  return (
    <AppShell>
      {children}
      <Toast />
    </AppShell>
  );
}
