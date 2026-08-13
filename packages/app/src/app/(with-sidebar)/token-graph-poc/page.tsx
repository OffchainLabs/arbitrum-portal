import type { Metadata } from 'next';
import { Suspense } from 'react';

import { TokenGraphPocClient } from './TokenGraphPocClient';

export const metadata: Metadata = {
  title: 'Token Graph PoC',
  description: 'Standalone proof of concept for graph-backed bridge token search and resolution.',
};

export default function TokenGraphPocPage() {
  return (
    <Suspense>
      <TokenGraphPocClient />
    </Suspense>
  );
}
