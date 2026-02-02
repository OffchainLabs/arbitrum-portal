import { Metadata } from 'next';

import { PageHeading } from '@/app-components/AppShell/components/PageHeading';
import { getEntityMetaData } from '@/portal/common/getMetaData';
import { ServerSideAppProps, getServerSideAppParams } from '@/portal/common/getServerSideAppParams';
import { spotlightOrbitChains } from '@/portal/common/orbitChains';
import { EntityType } from '@/portal/common/types';
import { CommunitySpotlight } from '@/portal/components/CommunitySpotlight';
import { FastWithdrawalAnnouncement } from '@/portal/components/FastWithdrawalAnnouncement';
import { GettingStarted } from '@/portal/components/OrbitEcosystem/GettingStarted';
import { HeroBanner } from '@/portal/components/OrbitEcosystem/HeroBanner';
import { OrbitChainsListingByCategories } from '@/portal/components/OrbitEcosystem/OrbitChainsListingByCategories';

const metadataContent = {
  title: 'Arbitrum Chains — A Universe of Chains',
  description:
    "Discover Arbitrum Chains: Customizable Solutions Built on Arbitrum's Advanced Blockchain Technology",
};

// Generate server-side metadata for this page
export function generateMetadata(props: ServerSideAppProps): Metadata {
  const { selectedOrbitChain } = getServerSideAppParams(props);

  const entitySlug = selectedOrbitChain || '';

  const entityMetaData = getEntityMetaData(EntityType.OrbitChain, entitySlug);

  if (entityMetaData) {
    return entityMetaData;
  }

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

export default function OrbitPage() {
  return (
    <div className="flex flex-col gap-8 lg:gap-12">
      <PageHeading>Chains</PageHeading>
      <HeroBanner />

      <GettingStarted />

      <FastWithdrawalAnnouncement />

      <CommunitySpotlight
        title="Chain Spotlight"
        entitySlugs={spotlightOrbitChains}
        entityType={EntityType.OrbitChain}
      />

      <OrbitChainsListingByCategories />
    </div>
  );
}
