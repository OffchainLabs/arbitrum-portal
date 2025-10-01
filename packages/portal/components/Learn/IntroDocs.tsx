import { twMerge } from 'tailwind-merge';

import { Card } from '@/components/Card';

const docsContent = [
  {
    title: 'About Arbitrum',
    description: 'A gentle introduction to Arbitrum',
    className: 'hover:bg-[#152C4E75] bg-[#152C4E]',
    bgImage: "url('/images/intro-arbitrum.webp')",
    link: 'https://docs.arbitrum.io/welcome/arbitrum-gentle-introduction',
  },
  {
    title: 'About Stylus',
    description: 'A gentle introduction to Stylus',
    className: 'hover:bg-[#F6267475] bg-[#F62674]',
    bgImage: "url('/images/intro-stylus.webp')",
    link: 'https://docs.arbitrum.io/stylus/stylus-gentle-introduction',
  },
  {
    title: 'About Orbit',
    description: 'A gentle introduction to Orbit Chains',
    className: 'hover:bg-[#12AAFF75] bg-[#12AAFF]',
    bgImage: "url('/images/intro-orbit.webp')",
    link: 'https://docs.arbitrum.io/launch-orbit-chain/orbit-gentle-introduction',
  },
  {
    title: 'About our networks',
    description: 'An explanation of Arbitrum One, Arbitrum Nova, Sepolia, and more',
    className: 'hover:bg-[#E5731075] bg-[#E57310]',
    bgImage: "url('/images/intro-networks.webp')",
    link: 'https://docs.arbitrum.io/build-decentralized-apps/public-chains',
  },
];

export const IntroDocs = () => {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col justify-between lg:flex-row lg:items-end">
        <div className="text-2xl">Intro Docs</div>
      </div>
      <hr className="border-white/40" />
      <div className="grid grid-cols-2 gap-4 text-sm lg:grid-cols-4">
        {docsContent.map((content, index) => (
          <Card
            cardType="externalLink"
            href={content.link}
            key={`intro-docs-content-${index}`}
            className={twMerge(
              'flex h-[200px] flex-col gap-1 bg-1/2 bg-right-bottom bg-no-repeat',
              content.className,
            )}
            style={{
              backgroundImage: content.bgImage,
            }}
            analyticsProps={{
              eventName: `Learn Page - Intro Docs Clicks`,
              eventProperties: {
                Title: content.title,
              },
            }}
          >
            <div className="text-base font-semibold">{content.title}</div>
            <div className="opacity-75">{content.description}</div>
          </Card>
        ))}
      </div>
    </div>
  );
};
