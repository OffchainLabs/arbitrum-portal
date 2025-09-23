'use client';

import Image from 'next/image';
import dynamic from 'next/dynamic';
import { usePostHog } from 'posthog-js/react';
import { twMerge } from 'tailwind-merge';
import { useLocalStorage } from '@uidotdev/usehooks';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { Card } from '@/components/Card';
import { BRIDGE_LINK } from '@/common/constants';
import { LoadingPlaceholderCarousel } from '@/components/Carousel/LoadingPlaceholderCarousel';
import { ExternalLink } from '@/components/ExternalLink';

const Carousel = dynamic(() => import('@/components/Carousel/Carousel'), {
  ssr: false,
  loading: LoadingPlaceholderCarousel,
});

const SHOW_INTRO_TO_ORBIT_KEY = 'arbitrum:portal:orbit:intro';

const content = [
  {
    title: 'Bridge to Arbitrum',
    description:
      "To play a game or use an app on an Orbit chain, you'll need to have funds on that specific chain. Although Orbit chains are their own blockchains, they are built using Arbitrum technology.",
    link: BRIDGE_LINK,
    cta: 'Start Bridging',
    image: (
      <Image
        alt="Bridge to Arbitrum"
        src="/images/getting-started-1.webp"
        layout="fill"
        objectFit="contain"
      />
    ),
  },
  {
    title: 'What is a Gas Fee Token?',
    description:
      'Gas tokens are used to power transactions on a blockchain. ETH is the gas token of Arbitrum One and Ethereum. Orbit chains often use their own gas token, although some may also choose ETH.',
    link: 'https://docs.arbitrum.io/launch-orbit-chain/how-tos/customize-deployment-configuration#gas-token',
    cta: 'Learn More',
    gradientOverlay: true,
    image: (
      <Image
        alt="What is a Gas Fee Token?"
        src="/images/getting-started-2.webp"
        layout="fill"
        objectFit="cover"
      />
    ),
  },
  {
    title: 'What is Orbit?',
    description:
      'Orbit chains are custom individual blockchains built using Arbitrum technology. These chains have unique features while maintaining Arbitrum ecosystem compatibility. ',
    link: 'https://docs.arbitrum.io/launch-orbit-chain/orbit-gentle-introduction#whats-orbit',
    cta: 'Learn More',
    gradientOverlay: true,
    image: (
      <Image
        alt="What is Orbit?"
        src="/images/getting-started-3.webp"
        layout="fill"
        objectFit="cover"
      />
    ),
  },
];

const ShowHideSectionButton = ({
  showSection,
  setShowSection,
}: {
  showSection: boolean;
  setShowSection: (val: boolean) => void;
}) => {
  const posthog = usePostHog();

  const handleShowSection = () => {
    setShowSection(!showSection);
    posthog?.capture(
      `Orbit Page - ${showSection ? 'Hide' : 'Show'} Getting Started Section`,
    );
  };

  return (
    <button
      className={twMerge(
        'flex w-min shrink-0 items-center gap-2 whitespace-nowrap rounded-md bg-default-black p-2 px-3 text-xs hover:bg-default-black-hover',
        showSection ? 'z-0 mr-[90px]' : '', // pull the `Hide` button to the left to accommodate for the carousel-control buttons
      )}
      onClick={handleShowSection}
    >
      {showSection ? (
        <EyeSlashIcon className="h-4 w-4" />
      ) : (
        <EyeIcon className="h-4 w-4" />
      )}
      {showSection ? 'Hide' : 'Show Intro to Orbit'}
    </button>
  );
};
export const GettingStarted = () => {
  const [showSection, setShowSection] = useLocalStorage<boolean>(
    SHOW_INTRO_TO_ORBIT_KEY,
    true,
  );

  if (!showSection) {
    return (
      <ShowHideSectionButton
        showSection={showSection}
        setShowSection={setShowSection}
      />
    );
  }

  return (
    <div className="align-carousel-controls-with-title relative flex flex-col gap-4">
      <div className="z-30 flex justify-between">
        <div className="text-2xl">Getting Started</div>
        <ShowHideSectionButton
          showSection={showSection}
          setShowSection={setShowSection}
        />
      </div>
      <hr className="border-white/40" />

      <Carousel>
        {content.map((item, index) => (
          <Card
            key={`getting_started_${index}`}
            className="relative mx-2 flex shrink-0 flex-col items-center bg-default-black p-0 lg:h-[300px] lg:w-[90%] lg:flex-row lg:gap-8"
          >
            <div className="flex flex-col gap-4 p-6 lg:p-[50px]">
              <div className="text-lg">{item.title}</div>
              <div className="text-xs">{item.description}</div>
              <ExternalLink
                className="my-1 w-min shrink-0 whitespace-nowrap rounded-md bg-white p-2 px-3 text-xs text-default-black hover:bg-white/80"
                href={item.link}
              >
                {item.cta}
              </ExternalLink>
            </div>

            <div className="relative h-[250px] w-full shrink-0 lg:h-full lg:w-1/2">
              {item.gradientOverlay && (
                <div className="absolute left-0 top-0 z-10 h-full w-full bg-gradient-to-b from-default-black to-transparent lg:bg-gradient-to-r" />
              )}
              {item.image}
            </div>
          </Card>
        ))}
      </Carousel>
    </div>
  );
};
