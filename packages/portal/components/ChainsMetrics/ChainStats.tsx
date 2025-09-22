import { Card } from '@/components/Card';
import { PortalStats } from '@/common/types';
import { dayjs, DISPLAY_DATETIME_FORMAT } from '@/common/dateUtils';
import statsJson from '@/public/__auto-generated-stats.json';

const formatter = Intl.NumberFormat('en', { notation: 'compact' });

const statsGeneratedOn = statsJson.meta.timestamp;
const stats = statsJson.content as PortalStats;

export const ChainStats = () => {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col justify-between lg:flex-row lg:items-end">
        <div className="text-2xl">By the Numbers</div>
        <span className="text-xs italic opacity-70">
          Updated on {dayjs(statsGeneratedOn).format(DISPLAY_DATETIME_FORMAT)}
        </span>
      </div>
      <hr className="border-white/40" />
      <div className="grid grid-cols-2 gap-4 text-sm lg:grid-cols-3">
        <div className="col-span-1 flex flex-col gap-4">
          <Card
            className="relative flex h-[100px] flex-col gap-1 bg-contain bg-right-bottom bg-no-repeat"
            style={{
              backgroundImage: `url('/images/illustration-stats-1.webp')`,
            }}
          >
            <span className="text-3xl">{stats.totalOrbitChainsOnMainnet}</span>{' '}
            Chains on Mainnet
          </Card>
          <Card className="flex h-[100px] flex-col gap-1">
            <span className="text-3xl">
              ${formatter.format(stats.totalAmountBridgedToOrbit)}
            </span>{' '}
            Total Bridged
          </Card>
        </div>
        <div className="col-span-1 flex flex-col gap-4">
          <Card className="flex h-[100px] flex-col gap-1">
            <span className="text-3xl">
              $
              {stats.medianFeePerOrbitTransaction < 0.00001
                ? '< 0.00001'
                : stats.medianFeePerOrbitTransaction.toFixed(5)}{' '}
            </span>{' '}
            Median Fee Per Transaction
          </Card>
          <Card
            className="relative flex h-[100px] flex-col gap-1 bg-cover bg-right-bottom bg-no-repeat"
            style={{
              backgroundImage: `url('/images/illustration-stats-2.webp')`,
            }}
          >
            <span className="text-3xl">
              {formatter.format(stats.totalOrbitDevelopers)}+
            </span>{' '}
            Human Developers
          </Card>
        </div>
        <Card
          className="relative col-span-2 flex min-h-[100px] flex-col gap-1 bg-contain bg-right-bottom bg-no-repeat lg:col-span-1 lg:bg-[length:200px_200px]"
          style={{
            backgroundImage: `url('/images/illustration-stats-3.webp')`,
          }}
        >
          <span className="text-3xl">
            {formatter.format(stats.totalWalletsConnectedToOrbitChains)}+
          </span>{' '}
          Total Wallets Connected
        </Card>
      </div>
    </div>
  );
};
