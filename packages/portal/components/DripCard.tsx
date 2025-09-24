import Image from 'next/image';
import { ExternalLink } from '@/components/ExternalLink';
import { Card } from './Card';

export const DripCard = () => {
  return (
    <Card
      className="relative flex shrink-0 grow-0 flex-col gap-6 bg-[#a6f842] p-4 py-6 text-black hover:bg-[#00daf5]/80 lg:p-6"
      cardType="externalLink"
      style={{
        background: 'linear-gradient(to bottom, #a6f842, #00daf5)',
      }}
      href="https://arbitrumdrip.com/"
      grainy
    >
      <div className="z-10 flex h-full w-full flex-col justify-around gap-4">
        <Image
          alt="Arbitrum Drip"
          src="/images/arbitrum-logo-white-no-text.svg"
          height={40}
          width={40}
          className="drop-shadow-[0_0px_2px_rgba(0,0,0,0.5)]"
          // overlay image with black color - use filter property
          style={{
            filter: 'invert(1)',
          }}
        />

        <div className="flex flex-col flex-nowrap gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="lg:w-3/4">
            <div className="text-base lg:text-2xl">
              DRIP is now live.{' '}
              <span className="font-light opacity-70">
                The DeFi Renaissance Incentive Program rewards real DeFi actions
                on Arbitrum. Use your crypto to deposit, borrow, loop, and
                repeat!
              </span>
            </div>
          </div>

          <p
            className={
              'text-xs underline underline-offset-8 hover:no-underline'
            }
          >
            Learn More
          </p>
        </div>
      </div>
    </Card>
  );
};
