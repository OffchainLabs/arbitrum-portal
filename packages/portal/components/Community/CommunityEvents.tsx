import dynamic from 'next/dynamic';
import { ArbitrumWebsiteNotionCmsRow } from '@/common/types';
import { CalendarCard } from '@/components/CalendarCard';
import { LoadingPlaceholderCarousel } from '@/components/Carousel/LoadingPlaceholderCarousel';

const Carousel = dynamic(() => import('@/components/Carousel/Carousel'), {
  ssr: false,
  loading: LoadingPlaceholderCarousel,
});

export const CommunityEvents = ({
  calendarEvents,
}: {
  calendarEvents: ArbitrumWebsiteNotionCmsRow[];
}) => {
  if (!calendarEvents?.length) {
    return null;
  }

  return (
    <div className="align-carousel-controls-with-title relative flex w-full flex-col gap-4">
      <div className="flex flex-col justify-between lg:flex-row lg:items-end">
        <div className="text-2xl">IRL Events</div>
      </div>
      <hr className="border-white/40" />
      <Carousel>
        {calendarEvents.map((calendarCard) => (
          <CalendarCard
            key={calendarCard.id}
            link={calendarCard.link}
            type="Event"
            title={calendarCard.text}
            subTitle={calendarCard.smallText}
          />
        ))}
      </Carousel>
    </div>
  );
};
