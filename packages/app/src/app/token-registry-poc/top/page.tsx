import { Metadata } from 'next';
import { Suspense } from 'react';

import { TopTokensPoc } from './TopTokensPoc';

export const metadata: Metadata = {
  title: 'Token Registry PoC: top tokens',
  robots: { index: false },
};

export default function TopTokensPocPage() {
  // The page reads its URL with useSearchParams.
  return (
    <Suspense fallback={null}>
      <TopTokensPoc />
    </Suspense>
  );
}
