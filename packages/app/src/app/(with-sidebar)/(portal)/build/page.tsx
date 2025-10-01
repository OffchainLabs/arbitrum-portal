import { Metadata } from 'next';

import { ArbitrumStatus } from '@/portal/common/types';
import { BuildSection } from '@/portal/components/Build/BuildSection';
import { Explorers } from '@/portal/components/Build/Explorers';
import { HeroBanner } from '@/portal/components/Build/HeroBanner';
import { NetworkStatus } from '@/portal/components/Build/NetworkStatus';

const metadataContent = {
  title: 'Build with Arbitrum',
  description: 'Get your hands dirty and jump into technical docs and tutorials',
};

// Generate server-side metadata for this page
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

const fetchStatus = async () => {
  try {
    const data = await fetch('https://status.arbitrum.io/summary.json');
    const status = (await data.json()).page.status;

    if (Object.values(ArbitrumStatus).includes(status as ArbitrumStatus)) {
      return status as ArbitrumStatus;
    }

    return ArbitrumStatus.UNKNOWN;
  } catch (e) {
    return ArbitrumStatus.UNKNOWN;
  }
};

export default async function BuildPage() {
  const status = await fetchStatus();

  return (
    <div className="flex flex-col gap-8 lg:gap-12">
      <HeroBanner />

      <BuildSection />

      {/* Monitor section */}
      <div className="flex flex-col gap-8">
        <div className="flex flex-col justify-between lg:flex-row lg:items-end">
          <h2 className="text-2xl">Monitor</h2>
        </div>
        <hr className="-mt-4 border-white/40" />

        <NetworkStatus status={status} />

        <Explorers />
      </div>
    </div>
  );
}
