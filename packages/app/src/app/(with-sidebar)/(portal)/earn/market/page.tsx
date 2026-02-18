import { Metadata } from 'next';

import { AllOpportunitiesPage } from '@/app-components/earn/AllOpportunitiesPage';

export const metadata: Metadata = {
  title: 'Earn - All Opportunities',
};

export default function MarketPage() {
  return <AllOpportunitiesPage />;
}
