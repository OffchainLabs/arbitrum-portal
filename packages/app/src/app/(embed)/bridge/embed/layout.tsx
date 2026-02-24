import '@rainbow-me/rainbowkit/styles.css';
import { PropsWithChildren } from 'react';
import 'react-toastify/dist/ReactToastify.css';

import { AppShell } from '@/app-components/AppShell/AppShell';

export default function EmbedLayout(props: PropsWithChildren) {
  return (
    <AppShell>
      <div className="bg-widget-background h-screen">{props.children}</div>
    </AppShell>
  );
}
