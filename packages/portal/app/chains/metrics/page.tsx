import { Card } from '@/components/Card';
import { ChainsTable } from '@/components/ChainsMetrics/ChainsTable';
import { ChainStats } from '@/components/ChainsMetrics/ChainStats';
import { Metadata } from 'next';

const metadataContent = {
  title: 'Arbitrum Chains Metrics',
  description:
    'Explore detailed metrics for all Arbitrum Chains showing TVL, TPS, wallets, and transactions. Filter chains by category, TVL, TPS, and share your custom filtered view.',
};

export function generateMetadata(): Metadata {
  return {
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
}

export default function ChainsMetricsPage() {
  return (
    <div className="flex flex-col gap-8 lg:gap-12">
      {/* Header banner */}
      <Card className="relative flex h-[120px] items-center bg-[#1B4ADD] p-4 lg:p-8">
        <h1 className="z-20 text-2xl">Arbitrum Chain Stats</h1>
        <div className="absolute left-0 top-0 z-10 h-full w-full bg-gradient-to-t from-blue from-70% to-transparent lg:bg-gradient-to-r lg:to-[90%]" />
      </Card>

      <ChainStats />

      <ChainsTable />
    </div>
  );
}
