import { ArrowRightIcon, TicketIcon } from '@heroicons/react/24/outline';

import { Card } from '@/components/Card';

export function RetryableTicketsLinkCard({
  ctaLabel,
  entryPoint,
}: {
  ctaLabel: string;
  entryPoint: string;
}) {
  return (
    <Card
      cardType="link"
      href="/build/retryables"
      className="flex flex-col gap-4 border border-gray-dark sm:flex-row sm:items-center sm:justify-between"
      analyticsProps={{
        eventName: 'Retryable Tickets Tool Click',
        eventProperties: { entryPoint },
      }}
    >
      <div className="flex items-center gap-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-white/10">
          <TicketIcon className="h-5 w-5" />
        </span>
        <div className="flex flex-col gap-1">
          <span className="text-base">Retryable tickets</span>
          <span className="text-white/70">
            Check the status of a cross-chain message and redeem it if it&apos;s stuck.
          </span>
        </div>
      </div>

      <span className="flex w-fit shrink-0 items-center gap-2 rounded border border-white/20 px-3 py-2 group-hover:bg-white/10">
        {ctaLabel}
        <ArrowRightIcon className="h-4 w-4" />
      </span>
    </Card>
  );
}
