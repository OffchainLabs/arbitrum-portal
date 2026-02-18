import { Metadata } from 'next';

import { MyPositionsPage } from '@/app-components/earn/MyPositionsPage';

export const metadata: Metadata = {
  title: 'Earn - Your Holdings',
};

export default function MyPositionsPageRoute() {
  return <MyPositionsPage />;
}
