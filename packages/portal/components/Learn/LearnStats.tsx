import dayjs from 'dayjs';

import { DISPLAY_DATETIME_FORMAT } from '@/common/dateUtils';
import { PortalStats } from '@/common/types';
import { AnimatedNumber } from '@/components/AnimatedNumber';
import { Card } from '@/components/Card';
import statsJson from '@/public/__auto-generated-stats.json';

const statsGeneratedOn = statsJson.meta.timestamp;
const stats = statsJson.content as PortalStats;

export const LearnStats = () => {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col justify-between lg:flex-row lg:items-end">
        <div className="text-2xl">Stats</div>
        <span className="text-xs italic opacity-70">
          Updated on {dayjs(statsGeneratedOn).format(DISPLAY_DATETIME_FORMAT)}
        </span>
      </div>
      <hr className="border-white/40" />
      <div className="grid grid-cols-2 gap-4 text-sm lg:grid-cols-3">
        <Card
          className="relative flex h-[120px] flex-col gap-1 bg-contain bg-right-bottom bg-no-repeat"
          style={{
            backgroundImage: `url('/images/learn-stats-1.webp')`,
          }}
        >
          <span className="text-3xl">
            <AnimatedNumber number={stats.totalActiveWallets / 1_000_000} />
            M+
          </span>{' '}
          Total Active Accounts
        </Card>
        <Card
          className="relative flex h-[120px] flex-col gap-1 bg-contain bg-right-bottom bg-no-repeat"
          style={{
            backgroundImage: `url('/images/learn-stats-2.webp')`,
          }}
        >
          <span className="text-3xl">
            <AnimatedNumber number={stats.averageTxnsPerDayThisMonth} />
          </span>
          Avg Txs Per Day
        </Card>
        <Card
          className="relative col-span-2 flex h-[120px] flex-col gap-1 bg-contain bg-right-bottom bg-no-repeat lg:col-span-1"
          style={{
            backgroundImage: `url('/images/learn-stats-3.webp')`,
          }}
        >
          <span className="text-3xl">
            <AnimatedNumber number={stats.cheaperThanEthFactor} />x
          </span>
          Cheaper Gas on Arbitrum than Ethereum
        </Card>
      </div>
    </div>
  );
};
