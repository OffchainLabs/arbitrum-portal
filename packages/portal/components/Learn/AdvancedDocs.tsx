import { twMerge } from 'tailwind-merge';

import { Card } from '@/components/Card';

const diveDeeperContent = [
  {
    title: 'Inside Arbitrum Nitro',
    description: 'For the nerds ',
    borderClassName: 'to-[#AC560C] from-[#10213A]',
    link: 'https://docs.arbitrum.io/how-arbitrum-works/inside-arbitrum-nitro',
  },
  {
    title: 'Inside Arbitrum AnyTrust',
    description: 'Also for the nerds',
    borderClassName: 'from-[#13AAFF] to-[#F72774]',
    link: 'https://docs.arbitrum.io/how-arbitrum-works/inside-anytrust',
  },
  {
    title: 'Whitepaper',
    description: 'For the giga-brains',
    borderClassName: 'from-[#5D2657] to-[#983A44]',
    link: 'https://github.com/OffchainLabs/nitro/blob/master/docs/Nitro-whitepaper.pdf',
  },
  {
    title: 'Why Decentralization?',
    description: 'For the philosophers',
    borderClassName: 'from-[#078B75] to-[#F5FFB7]',
    link: 'https://docs.arbitrum.foundation/why-governance',
  },
];

export const AdvancedDocs = () => {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col justify-between lg:flex-row lg:items-end">
        <div className="text-2xl">Dive Deeper</div>
      </div>
      <hr className="border-white/40" />
      <div className="grid grid-cols-2 gap-4 text-sm lg:grid-cols-4">
        {diveDeeperContent.map((content, index) => (
          <Card
            cardType="externalLink"
            href={content.link}
            key={`dive-deeper-${index}`}
            className="relative flex h-[150px] flex-col gap-1"
            analyticsProps={{
              eventName: `Learn Page - Advanced Docs Clicks`,
              eventProperties: {
                Title: content.title,
              },
            }}
          >
            <div className="text-base font-semibold">{content.title}</div>
            <div className="opacity-75">{content.description}</div>

            <div
              className={twMerge(
                'absolute bottom-0 left-0 h-[10px] w-full bg-gradient-to-r',
                content.borderClassName,
              )}
            />
          </Card>
        ))}
      </div>
    </div>
  );
};
