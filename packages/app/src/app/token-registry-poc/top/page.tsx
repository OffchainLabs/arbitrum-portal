import { Metadata } from 'next';

import { TopTokensPoc } from './TopTokensPoc';

export const metadata: Metadata = {
  title: 'Token Registry PoC: top tokens',
  robots: { index: false },
};

export default function TopTokensPocPage() {
  return <TopTokensPoc />;
}
