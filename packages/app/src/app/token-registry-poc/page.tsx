import { Metadata } from 'next';
import { Suspense } from 'react';

import { TokenRegistryPoc } from './TokenRegistryPoc';

export const metadata: Metadata = {
  title: 'Token Registry PoC',
  robots: { index: false },
};

export default function TokenRegistryPocPage() {
  return (
    <Suspense fallback={null}>
      <TokenRegistryPoc />
    </Suspense>
  );
}
