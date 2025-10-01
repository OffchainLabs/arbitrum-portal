import Image from 'next/image';

import { Card } from '@/components/Card';

export const CareersCard = () => (
  <Card
    cardType="externalLink"
    className="relative m-1 flex shrink-0 grow-0 flex-col flex-nowrap items-start justify-around bg-[#152C4E] p-4 py-6 text-base hover:bg-[#152C4E80] lg:m-0 lg:h-[160px] lg:min-h-min lg:p-6 lg:text-2xl"
    href="https://jobs.arbitrum.io/"
    grainy
    analyticsProps={{
      eventName: `Community Page Clicks`,
      eventProperties: {
        Link: 'Careers',
      },
    }}
  >
    <Image
      alt="Arbitrum Jobs"
      src="/images/arbitrum-logo-white.svg"
      width={190}
      height={40}
      className="z-10 -ml-3 -mt-2 mb-3 w-[150px] shrink-0 p-1 mix-blend-screen lg:-ml-4 lg:mt-0 lg:w-auto"
    />

    <div className="flex w-full flex-col flex-nowrap items-start justify-between gap-4 text-lg lg:flex-row lg:items-end lg:text-2xl">
      <div className="text-white/50">
        <span className="text-white">Jobs in the Arbitrum Ecosystem.</span> Career opportunities to
        build a more secure and decentralized tomorrow.
      </div>
      <div className="whitespace-nowrap text-xs underline underline-offset-8">Learn More</div>
    </div>
  </Card>
);
