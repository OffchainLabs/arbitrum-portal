import { CheckCircleIcon, ExclamationCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { twMerge } from 'tailwind-merge';

import { ArbitrumStatus } from '@/common/types';
import { Card } from '@/components/Card';
import { ExternalLink } from '@/components/ExternalLink';

const statusToContentMap = {
  [ArbitrumStatus.UP]: {
    content: 'All systems operational',
    className: 'bg-[#00B09380] hover:bg-[#00B093]',
    icon: <CheckCircleIcon className="h-6 w-6 shrink-0" />,
  },
  [ArbitrumStatus.HASISSUES]: {
    content: 'Experiencing issues. Please check the status page for details.',
    className: 'bg-[#ECC94B60] hover:bg-[#ECC94B80]',
    icon: <ExclamationCircleIcon className="h-6 w-6 shrink-0" />,
  },
  [ArbitrumStatus.UNDERMAINTENANCE]: {
    content: 'Experiencing issues. Please check the status page for details.',
    className: 'bg-[#8f485d80] hover:bg-[#8f485d]',
    icon: <XCircleIcon className="h-6 w-6 shrink-0" />,
  },
  [ArbitrumStatus.UNKNOWN]: {
    content: 'Could not fetch network status. Please check the status page for details.',
    className: 'bg-[#DFE0E160] hover:bg-[#DFE0E180]',
    icon: <ExclamationCircleIcon className="h-6 w-6 shrink-0" />,
  },
};

export const NetworkStatus = ({ status }: { status: ArbitrumStatus }) => {
  return (
    <Card className="flex flex-col gap-4 bg-default-black">
      <div className="flex flex-row items-center justify-between">
        <h3 className="text-lg">Network Status</h3>
        <ExternalLink
          href="https://status.arbitrum.io/"
          className="text-xs underline underline-offset-4"
        >
          See More
        </ExternalLink>
      </div>
      <hr className="border-white/40" />
      <Card
        cardType="externalLink"
        href="https://status.arbitrum.io/"
        className={twMerge(
          'flex flex-row items-center gap-2',
          statusToContentMap[status].className,
        )}
      >
        {statusToContentMap[status].icon}
        <div className="text-base">{statusToContentMap[status].content}</div>
      </Card>
    </Card>
  );
};
