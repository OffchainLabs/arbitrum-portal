import { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { getEntityMetaData } from '@/common/getMetaData';
import { ServerSideAppProps, getServerSideAppParams } from '@/common/getServerSideAppParams';
import { EntityType } from '@/common/types';
import { DripCard } from '@/components/DripCard';
import { EcosystemEssentials } from '@/components/HomePage/EcosystemEssentials';
import { HeroBanner } from '@/components/HomePage/HeroBanner';
import { HomePageFAQs } from '@/components/HomePage/HomePageFAQs';
import { LiveIncentivesProjects } from '@/components/HomePage/LiveIncentivesProjects';
import { NewProjects } from '@/components/HomePage/NewProjects';
import { Resources } from '@/components/HomePage/Resources';
import { TrendingProjects } from '@/components/HomePage/TrendingProjects';
import { SocialsFooter } from '@/components/SocialsFooter';

const metadataContent = {
  url: 'https://portal.arbitrum.io',
  title: 'Arbitrum Portal — Your Gateway into Arbitrum',
  description:
    'Discover apps, bridge to Layer 2, explore Arbitrum’s technology, find Web3 jobs, and connect with the thriving blockchain community',
};

// Generate server-side metadata for this page
export async function generateMetadata(props: ServerSideAppProps): Promise<Metadata> {
  const { selectedProject, selectedOrbitChain } = await getServerSideAppParams(props);

  const entityType = selectedProject ? EntityType.Project : EntityType.OrbitChain;

  const entitySlug = selectedProject || selectedOrbitChain || '';

  const entityMetaData = getEntityMetaData(entityType, entitySlug);

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

export default async function Home(props: ServerSideAppProps) {
  const { legacyCategories } = await getServerSideAppParams(props);
  // if found the deprecated url's of the format /?categories=defi, redirect them to /projects/defi
  if (legacyCategories) {
    redirect(`/projects/${legacyCategories}`);
  }

  return (
    <div className="flex flex-col gap-8 lg:gap-12">
      <HeroBanner />

      <LiveIncentivesProjects />

      <TrendingProjects />

      <EcosystemEssentials />

      <DripCard />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-8">
        <div className="lg:col-span-5">
          <Resources />
        </div>
        <div className="lg:col-span-3">
          <NewProjects />
        </div>
      </div>

      <HomePageFAQs />

      <SocialsFooter />
    </div>
  );
}
