import { HeroBanner } from '@/components/OrbitEcosystem/HeroBanner';
import { GettingStarted } from '@/components/OrbitEcosystem/GettingStarted';
import { CommunitySpotlight } from '@/components/CommunitySpotlight';
import { spotlightOrbitChains } from '@/common/orbitChains';
import { EntityType } from '@/common/types';
import { OrbitChainsListingByCategories } from '@/components/OrbitEcosystem/OrbitChainsListingByCategories';
import { FastWithdrawalAnnouncement } from '@/components/FastWithdrawalAnnouncement';
import {
  getServerSideAppParams,
  ServerSideAppProps,
} from '@/common/getServerSideAppParams';
import { Metadata } from 'next';
import { getEntityMetaData } from '@/common/getMetaData';

const metadataContent = {
  title: 'Arbitrum Orbit — A Universe of Chains',
  description:
    "Discover Orbit Chains: Customizable Solutions Built on Arbitrum's Advanced Blockchain Technology",
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
