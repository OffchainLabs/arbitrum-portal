import { Card } from '@/components/Card';

const resourcesCards = [
  {
    title: 'Blog',
    description: 'Read words that are friendly to the less technical Arbitrum fans',
    link: 'https://blog.arbitrum.io/',
    image: '/images/banner-blog.webp',
  },
  {
    title: (
      <div>
        <span className="mr-1 line-through">Twitter</span> X
      </div>
    ),
    description: 'Hinged and unhinged takes on web3',
    link: 'https://x.com/arbitrum',
    image: '/images/banner-twitter.webp',
  },
  {
    title: 'YouTube',
    description: 'Why read when you can watch pretty moving pictures?',
    link: 'https://www.youtube.com/arbitrum',
    image: '/images/banner-youtube.webp',
  },
  {
    title: 'Bug Bounties',
    description: 'Find bugs, earn cash money',
    link: 'https://immunefi.com/bug-bounty/arbitrum/information/',
    image: '/images/banner-bugbounties.webp',
  },
];

export const CommunityResources = () => {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-row items-end justify-between">
        <div className="text-2xl">See what the 🐝 is about</div>
      </div>
      <hr className="border-white/40" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {resourcesCards.map((card) => (
          <Card
            cardType="externalLink"
            href={card.link}
            key={card.link}
            className="col-span-1 flex h-[250px] flex-col p-0 lg:w-full"
            analyticsProps={{
              eventName: `Community Page - Resource Clicks`,
              eventProperties: {
                Title: card.link,
              },
            }}
          >
            <div
              className="h-[140px] w-full shrink-0 overflow-hidden bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: `url(${card.image})` }}
            />

            <div className="flex flex-grow flex-col gap-3 p-4">
              <div className="line-clamp-2 text-sm font-semibold">{card.title}</div>
              <div className="flex flex-row gap-2 text-xs opacity-75">{card.description}</div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
