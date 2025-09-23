import Image from 'next/image';
import { DocumentTextIcon } from '@heroicons/react/24/solid';
import { FullProject, OrbitChain } from '@/common/types';
import { Card } from '@/components/Card';
import { DiscordIcon, TwitterXIcon } from '@/components/SvgIcons';
import { useMemo } from 'react';
import { ENTITY_METADATA, isOrbitChain, isProject } from '@/common/entities';

export const LinksWidget = ({
  entityDetails,
}: {
  entityDetails: FullProject | OrbitChain;
}) => {
  const fallbackNewsLink = `https://news.google.com/search?q=${encodeURI(
    entityDetails.title,
  )}%20web3&hl=en-US&gl=US&ceid=US%3Aen`;

  const entityType = entityDetails['entityType'];

  const socialLinks = useMemo(() => {
    const links = [
      {
        id: 'twitter',
        img: <TwitterXIcon size={20} />,
        href: entityDetails.links.twitter,
        title: 'See Twitter/X',
        analyticsTitle: 'Twitter',
      },
      {
        id: 'discord',

        img: <DiscordIcon size={20} />,
        href: entityDetails.links.discord,
        title: 'Join Discord',
        analyticsTitle: 'Discord',
      },
      {
        id: 'news',
        img: (
          <Image
            src="/images/news.webp"
            width={20}
            height={20}
            alt="news"
            className="fill-white"
          />
        ),
        href: entityDetails.links.news ?? fallbackNewsLink,
        title: 'Search News',
        analyticsTitle: 'News',
      },
    ];

    if (isProject(entityDetails)) {
      const coingeckoLink = entityDetails.links.coingecko ?? null;
      links.push({
        id: 'coingecko',
        img: (
          <Image
            src="/images/coingecko.webp"
            width={20}
            height={20}
            alt="coingecko"
            className="fill-white"
          />
        ),
        href: coingeckoLink,
        title: 'Explore CoinGecko',
        analyticsTitle: 'Coingecko',
      });
    }

    if (isOrbitChain(entityDetails)) {
      links.push({
        id: 'docs',
        img: <DocumentTextIcon className="h-[20px] w-[20px] fill-white" />,
        href: entityDetails.links.docs,
        title: 'Explore Docs',
        analyticsTitle: 'docs',
      });
    }

    return links;
  }, [fallbackNewsLink, entityDetails]);

  return (
    <div className="col-span-4 flex flex-col flex-nowrap gap-4 rounded-lg bg-default-black p-6 lg:flex-row lg:items-center">
      <span className="whitespace-nowrap pr-4">Connect</span>

      {socialLinks.map((socialLink) => {
        if (!socialLink.href) return null;
        return (
          <Card
            key={socialLink.id}
            cardType="externalLink"
            className="flex h-full flex-nowrap items-center gap-2 bg-white/10 fill-white p-3 hover:bg-white/20 lg:row-span-1"
            href={socialLink.href}
            analyticsProps={{
              eventName: `${ENTITY_METADATA[entityType].title} Panel Clicks`,
              eventProperties: {
                Link: socialLink.analyticsTitle,
              },
            }}
          >
            {socialLink.img}
            <span className="max-w-[150px] overflow-hidden text-ellipsis whitespace-nowrap">
              {socialLink.title}
            </span>
          </Card>
        );
      })}
    </div>
  );
};
