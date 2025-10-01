import Image from 'next/image';

import { Card } from '@/components/Card';
import { RaasProviderGrid } from '@/components/RaasProviderGrid';

const resourceCards = [
  {
    title: 'Developer Docs',
    description: 'Learn how to build decentralized apps with Arbitrum',
    className: 'col-span-1 lg:col-span-3',
    link: 'https://docs.arbitrum.io/welcome/get-started',
  },
  {
    title: 'Arbitrum Tutorials',
    description: 'Learn from a series of tutorials about how to build and interact with Arbitrum',
    className: 'col-span-1',
    link: 'https://github.com/OffchainLabs/arbitrum-tutorials',
  },
  {
    title: 'Arbitrum Stylus',
    description: 'Write smart contracts on Arbitrum in Rust, C, C++ and more',
    className: 'col-span-1',
    link: 'https://docs.arbitrum.io/stylus/stylus-overview',
  },
  {
    title: 'Infra and Tool Apps',
    description: 'Browse apps you can use to help you build and deploy on Arbitrum',
    className: 'col-span-1',
    link: 'https://portal.arbitrum.io/projects/infra-and-tools',
  },
];

export const BuildSection = () => {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col justify-between lg:flex-row lg:items-end">
        <h2 className="text-2xl">Build</h2>
      </div>
      <hr className="-mt-4 border-white/40" />

      {/* Launch your own project */}
      <Card
        className="flex flex-col gap-4 bg-default-black bg-left-top bg-no-repeat pt-[80px]"
        style={{
          backgroundImage: `url('/images/banner-build.webp')`,
          backgroundSize: 'auto 60px',
        }}
      >
        <div className="flex flex-col justify-between lg:flex-row lg:items-end">
          <h3 className="text-lg">Launch Your Own Project</h3>
        </div>
        <div className="-mt-3 text-sm opacity-70">
          Use the same tech stack you used for Ethereum to launch on Arbitrum
        </div>
        <hr className="border-white/40" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {resourceCards.map((card) => (
            <Card
              key={card.title}
              cardType="externalLink"
              href={card.link}
              className={`flex h-[150px] flex-col gap-1 bg-white/10 hover:bg-white/20 ${card.className}`}
              analyticsProps={{
                eventName: `Build Page - Resources Clicks`,
                eventProperties: {
                  Title: card.title,
                },
              }}
            >
              <div className="text-sm font-semibold">{card.title}</div>
              <div className="text-sm opacity-75">{card.description}</div>
            </Card>
          ))}
        </div>
      </Card>

      {/* Launch your own chain */}
      <Card
        className="flex flex-col gap-4 bg-default-black bg-top bg-no-repeat pt-[80px]"
        style={{
          backgroundImage: `url('/images/banner-launch.webp')`,
          backgroundSize: '100% 60px',
        }}
      >
        <div className="flex flex-col justify-between lg:flex-row lg:items-end">
          <h3 className="text-lg">Launch Your Own Chain</h3>
        </div>
        <div className="-mt-3 text-sm opacity-70">
          Leverage a third-party Rollup as a Service (RaaS) provider to take your orbit chain to
          mainnet.
        </div>
        <hr className="border-white/40" />

        <div className="grid grid-cols-1 gap-4">
          <RaasProviderGrid />
        </div>
      </Card>

      <Card
        className="flex flex-col gap-4 bg-default-black bg-left-top bg-no-repeat lg:flex-row"
        style={{
          backgroundImage: `url('/images/banner-grants.webp')`,
        }}
      >
        <Card className="shrink-0 grow-0 bg-transparent p-0 lg:w-[150px]">
          <div className="mb-1 text-lg font-semibold">Grants</div>
          <div className="text-sm opacity-75">Fund your project</div>
        </Card>

        <Card
          cardType="externalLink"
          href="https://arbitrum.foundation/grants"
          className="relative h-[150px] bg-white/10 backdrop-blur-md hover:bg-white/20"
          analyticsProps={{
            eventName: `Build Page - Grants Clicks`,
          }}
        >
          <div className="text-sm font-semibold">Arbitrum Foundation Grants</div>

          <Image
            src="/images/arbitrum-foundation-logo.webp"
            height={30}
            width={120}
            alt="Arbitrum Foundation Grants"
            className="absolute bottom-4 right-4"
          />
        </Card>
      </Card>
    </div>
  );
};
