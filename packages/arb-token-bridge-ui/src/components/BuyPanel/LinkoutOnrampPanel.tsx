import { ArrowUpRightIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import { twMerge } from 'tailwind-merge';

import { useMode } from '@/bridge/hooks/useMode';

import { Button } from '../common/Button';
import { ExternalLink } from '../common/ExternalLink';
import { BackButton } from './BackButton';
import { onrampServices } from './utils';

export function LinkoutOnrampPanel({ serviceSlug }: { serviceSlug: string }) {
  const { embedMode } = useMode();
  const service = onrampServices.find((s) => s.slug === serviceSlug);

  if (!service) {
    return null;
  }

  return (
    <div
      className={twMerge(
        'relative bg-white/10 rounded-md border border-white/30 px-5 pt-14  pb-6 text-white -mx-4 md:mx-0 w-[calc(100%_+_40px)] md:w-full',
        embedMode && 'mx-auto max-w-[540px]',
      )}
    >
      <div className="flex items-start justify-center gap-4">
        <div className="shrink-0 rounded-md overflow-hidden">
          <Image src={service.logo} alt={service.name} width={48} height={48} />
        </div>
        <div className="flex flex-col gap-1">
          <h2 className="text-xl">{service.name}</h2>
          <p className="text-sm max-w-md">
            Buy and transfer instantly using your debit card, bank account with Thirdweb{' '}
            {service.name}.
          </p>
        </div>
      </div>
      <ExternalLink href={service.link} className="block">
        <Button
          variant="primary"
          className={twMerge(
            'bg-white border-white text-black w-full mt-6',
            '[&>div>span]:flex [&>div>span]:flex-row [&>div>span]:justify-center [&>div>span]:items-center [&>div>span]:gap-2',
          )}
        >
          <span>Buy or transfer with {service.name}</span>
          <ArrowUpRightIcon className="h-3 w-3" />
        </Button>
      </ExternalLink>
      <BackButton />
    </div>
  );
}
