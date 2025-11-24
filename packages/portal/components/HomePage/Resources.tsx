import dynamic from 'next/dynamic';
import Image from 'next/image';
import { twMerge } from 'tailwind-merge';

import { Card, CardType } from '@/components/Card';
import { LoadingPlaceholderCarousel } from '@/components/Carousel/LoadingPlaceholderCarousel';

const Carousel = dynamic(() => import('@/components/Carousel/Carousel'), {
  ssr: false,
  loading: LoadingPlaceholderCarousel,
});

const ResourceCard = ({
  name,
  content,
  href,
  imageSrc,
  cardType,
  className,
}: {
  name: string;
  content: React.ReactNode;
  href: string;
  cardType: CardType;
  imageSrc: string;
  className: string;
}) => {
  return (
    <Card
      cardType={cardType}
      className={twMerge(
        'm-1 flex min-h-[200px] w-[80%] grow flex-col flex-nowrap items-start justify-around gap-0 text-base lg:m-0 lg:min-h-min lg:w-full lg:p-6 lg:text-2xl',
        className,
      )}
      href={href}
      grainy
    >
      <Image
        alt={name}
        src={imageSrc}
        width={80}
        height={80}
        className="z-10 -ml-2 mb-3 shrink-0 p-1 mix-blend-screen"
      />

      <div className="flex w-full flex-nowrap items-end justify-between gap-4 text-lg lg:text-2xl">
        {content}
        <div className="hidden whitespace-nowrap text-right text-xs underline underline-offset-4 md:flex">
          Learn More
        </div>
      </div>
    </Card>
  );
};

const Content = () => {
  return (
    <>
      <ResourceCard
        name="Arbitrum Blog"
        cardType="externalLink"
        href={'https://blog.arbitrum.io/'}
        imageSrc="/images/illustration-blog.webp"
        className="bg-[#152C4E] hover:bg-[#152C4E80]"
        content={
          <div className="max-w-full md:max-w-[80%]">
            Arbitrum Blog.{' '}
            <span className="opacity-60">
              Explore guides, market insights, technical breakdowns, and more.
            </span>
          </div>
        }
      />

      <ResourceCard
        name="Orbit"
        cardType="link"
        href={'/orbit'}
        imageSrc="/images/illustration-orbit.webp"
        className="bg-[#0C79B6] hover:bg-[#0C79B680]"
        content={
          <div className="max-w-full md:max-w-[80%]">
            Arbitrum Chains.{' '}
            <span className="opacity-60">Explore projects built with Arbitrum technology.</span>
          </div>
        }
      />
    </>
  );
};

export const Resources = () => {
  return (
    <>
      <div className="flex h-full flex-col gap-4">
        <div className="text-2xl">Resources</div>
        <hr className="border-white/40" />
        <div className="lg:hidden">
          <Carousel prevNextButtons={false}>
            <Content />
          </Carousel>
        </div>
        <div className="hidden h-full flex-col gap-4 lg:flex">
          <Content />
        </div>
      </div>
    </>
  );
};
