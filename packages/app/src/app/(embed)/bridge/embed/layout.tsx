import { PropsWithChildren } from 'react';
import 'react-toastify/dist/ReactToastify.css';

import { AppShell } from '@/app-components/AppShell/AppShell';

export default function EmbedLayout(props: PropsWithChildren) {
  return (
    <AppShell>
      <div className="h-screen bg-widget-background">{props.children}</div>
    </AppShell>
  );
}
