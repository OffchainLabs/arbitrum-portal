import { ChevronRightIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';

import { Card } from '@/components/Card';
import RetryableTicketIcon from '@/public/images/retryable-ticket.svg';

export function RetryableTicketsLinkCard({ entryPoint }: { entryPoint: string }) {
  return (
    <Card
      cardType="link"
      href="/build/retryables"
      className="flex flex-col gap-4 border border-white/10 sm:flex-row sm:items-center sm:justify-between"
      analyticsProps={{
        eventName: 'Retryable Tickets Tool Click',
        eventProperties: { entryPoint },
      }}
    >
      <div className="flex items-center gap-4">
        <Image src={RetryableTicketIcon} alt="" className="h-12 w-12 shrink-0" />
        <div className="flex flex-col gap-1">
          <span className="text-lg">Retryable Tickets</span>
          <span className="text-white/60">
            A retryable ticket can be redeemed for up to 7 days.
          </span>
        </div>
      </div>

      <span className="flex w-fit shrink-0 items-center gap-1 rounded-[10px] bg-gray-dark px-[15px] py-[10px] group-hover:bg-gray-dark/80">
        Check Status
        <ChevronRightIcon className="h-4 w-4" />
      </span>
    </Card>
  );
}
