import Image from 'next/image';

import { Card } from '@/components/Card';

const blockExplorerCards = [
  {
    title: 'Arbitrum One Block Explorer',
    link: 'https://arbiscan.io/',
    image: '/images/explorer-arb-one.webp',
  },
  {
    title: 'Arbitrum Nova Block Explorer',
    link: 'https://nova.arbiscan.io/',
    image: '/images/explorer-arb-nova.webp',
  },
  {
    title: 'Arbitrum Sepolia Block Explorer',
    link: 'https://sepolia.arbiscan.io/',
    image: '/images/explorer-arb-sepolia.webp',
  },
];

export const Explorers = () => {
  return (
    <Card
      className="flex flex-col gap-4 bg-default-black bg-left-top bg-no-repeat lg:flex-row"
      style={{
        backgroundImage: `url('/images/banner-explorers.webp')`,
      }}
    >
      <Card className="shrink-0 grow-0 bg-transparent p-0 lg:w-[150px]">
        <div className="mb-1 text-lg font-semibold">Explorers</div>
        <div className="text-sm opacity-75">
          Dive deep into any transaction on an Arbitrum chain
        </div>
      </Card>

      {blockExplorerCards.map((card) => (
        <Card
          key={card.title}
          cardType="externalLink"
          href={card.link}
          className="relative h-[150px] bg-white/10 backdrop-blur-md hover:bg-white/20"
          analyticsProps={{
            eventName: `Build Page - Explorers Clicks`,
            eventProperties: {
              Title: card.title,
            },
          }}
        >
          <div className="text-sm font-semibold">{card.title}</div>

          <Image
            src={card.image}
            height={20}
            width={100}
            alt={card.title}
            className="absolute bottom-4 right-4"
          />
        </Card>
      ))}
    </Card>
  );
};
