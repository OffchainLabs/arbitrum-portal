import { Metadata } from 'next';
import { ArbitrumWebsiteNotionCmsRow } from '@/common/types';
import { HeroBanner } from '@/components/Community/HeroBanner';
import { CommunityResources } from '@/components/Community/CommunityResources';
import { CareersCard } from '@/components/Community/CareersCard';
import { GovernanceSection } from '@/components/Community/GovernanceSection';
import { CommunityEvents } from '@/components/Community/CommunityEvents';

const metadataContent = {
  title: 'Arbitrum Community',
  description:
    'Engage with our resources to get involved with the Arbitrum community',
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

const fetchCalendarEvents = async () => {
  try {
    const data = await fetch(
      'https://arbitrum.io/__auto-generated-content.json',
    );
    const events = (await data.json()).content.homepage.news
      .events as ArbitrumWebsiteNotionCmsRow[];

    return events.filter(
      (item) =>
        item.name.includes('card') &&
        !!item.link &&
        !!item.text &&
        !!item.smallText,
    );
  } catch (e) {
    return [] as ArbitrumWebsiteNotionCmsRow[];
  }
};

export default async function CommunityPage() {
  const calendarEvents = await fetchCalendarEvents();

  return (
    <div className="flex flex-col gap-8 font-light lg:gap-12">
      <HeroBanner />

      <CommunityResources />

      <CareersCard />

      <CommunityEvents calendarEvents={calendarEvents} />

      <GovernanceSection />
    </div>
  );
}
