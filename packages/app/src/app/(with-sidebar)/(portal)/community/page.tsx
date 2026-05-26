import { Metadata } from 'next';

import { CareersCard } from '@/portal/components/Community/CareersCard';
import { CommunityResources } from '@/portal/components/Community/CommunityResources';
import { GovernanceSection } from '@/portal/components/Community/GovernanceSection';
import { HeroBanner } from '@/portal/components/Community/HeroBanner';

const metadataContent = {
  title: 'Arbitrum Community',
  description: 'Engage with our resources to get involved with the Arbitrum community',
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

export default function CommunityPage() {
  return (
    <div className="flex flex-col gap-8 font-light lg:gap-12">
      <HeroBanner />

      <CommunityResources />

      <CareersCard />

      <GovernanceSection />
    </div>
  );
}
