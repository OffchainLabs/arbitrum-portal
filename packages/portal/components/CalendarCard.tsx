// taken directly from https://github.com/OffchainLabs/arbitrum-website/blob/ae274056463c83271a7cf989de35d30d5aca9dd0/app/community/calendarCard.tsx

import { twMerge } from 'tailwind-merge';
import { Card } from '@/components/Card';

type EventType = 'Hackathon' | 'Event';

function getTypeTextColor(type: EventType) {
  switch (type) {
    case 'Hackathon':
      return 'text-nova-orange';
    case 'Event':
    default:
      return 'text-blue';
  }
}

export const CalendarCard = ({
  link,
  type,
  title,
  subTitle,
}: {
  link: string;
  type: EventType;
  title: string;
  subTitle: string;
}) => {
  return (
    <Card
      cardType="externalLink"
      href={link}
      className="mr-3 flex w-[80%] flex-col items-start rounded-md p-4 lg:w-[300px]"
      analyticsProps={{
        eventName: `Community Page - Event Clicks`,
        eventProperties: {
          Title: title,
        },
      }}
    >
      <h6 className={twMerge(getTypeTextColor(type), 'text-sm')}>{type}</h6>
      <p className="leading-extra-tight line-clamp-1 text-lg lg:text-xl">
        {title}
      </p>
      <span className="leading-extra-tight text-lg opacity-50 lg:text-xl">
        {subTitle}
      </span>
      <span
        className={twMerge(
          'mt-12 border-b py-[3px] text-xs leading-none',
          'lg:mt-11',
        )}
        aria-label={`Learn more about ${title}`}
      >
        Learn More
      </span>
    </Card>
  );
};
