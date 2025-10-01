import { twMerge } from 'tailwind-merge';

import { Card } from '@/components/Card';

const governanceCards = [
  {
    title: 'Arbitrum Foundation',
    description: 'Learn how the biggest and most secure Layer 2 is governed',
    borderClassName: 'to-[#AC560C] from-[#10213A]',
    link: 'https://arbitrum.foundation/',
  },
  {
    title: 'Governance Forum',
    description: 'Browse Arbitrum Improvement Proposals and see what people are voting on',
    borderClassName: 'from-[#13AAFF] to-[#F72774]',
    link: 'https://forum.arbitrum.foundation/',
  },
  {
    title: 'Research Forum',
    description: 'Dive deep into the weeds of technical discourse',
    borderClassName: 'from-[#5D2657] to-[#983A44]',
    link: 'https://research.arbitrum.io/',
  },
  {
    title: 'Grants',
    description: 'Get your project funded',
    borderClassName: 'from-[#078B75] to-[#F5FFB7]',
    link: 'https://arbitrum.foundation/grants',
  },
];

export const GovernanceSection = () => {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col justify-between lg:flex-row lg:items-end">
        <div className="text-2xl">Get involved with governance</div>
      </div>
      <hr className="border-white/40" />
      <div className="grid grid-cols-2 gap-4 text-sm lg:grid-cols-4">
        {governanceCards.map((content, index) => (
          <Card
            cardType="externalLink"
            href={content.link}
            key={`dive-deeper-${index}`}
            className="relative flex flex-col gap-1 lg:h-[150px]"
            analyticsProps={{
              eventName: `Community Page - Governance Clicks`,
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
