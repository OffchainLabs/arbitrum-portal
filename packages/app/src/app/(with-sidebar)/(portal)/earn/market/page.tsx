import { Metadata } from 'next';

import { AllOpportunitiesPage } from '@/app-components/earn/AllOpportunitiesPage';

const metadataContent = {
  title: 'Earn yield on Arbitrum | Lending, Liquid Staking & Fixed Yield',
  description:
    'Discover earning opportunities on Arbitrum across lending, liquid staking, and fixed yield. Compare APYs, TVL, and your holdings for markets like Aave, Ether.fi, Lido, and Pendle in one place.',
};

export const metadata: Metadata = {
  title: metadataContent.title,
  description: metadataContent.description,
  openGraph: {
    title: metadataContent.title,
    description: metadataContent.description,
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: metadataContent.title,
    description: metadataContent.description,
  },
};

export default function MarketPage() {
  return <AllOpportunitiesPage />;
}
