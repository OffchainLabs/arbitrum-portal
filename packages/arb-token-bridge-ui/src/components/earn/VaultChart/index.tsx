'use client';

import { DetailedVault } from 'arb-token-bridge-ui/src/types/vaults';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';

import { Card } from '@/components/Card';

import { useVaultHistoricalData } from '../../../hooks/earn/useVaultHistoricalData';
import { ApyAreaChart } from './ApyAreaChart';
import { ChartContainer } from './ChartContainer';
import { TvlAreaChart } from './TvlAreaChart';

type RangeKey = '7d' | '30d' | '90d' | '1y';
type MetricKey = 'price' | 'apy' | 'tvl';

const RANGE_TO_DAYS: Record<RangeKey, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '1y': 365,
};

export function VaultChart({ vault }: { vault: DetailedVault }) {
  const [range, setRange] = useState<RangeKey>('7d');
  const [metric, setMetric] = useState<MetricKey>('apy');

  // Fetch only as many weekly points as needed for the selected range.
  // Avoid dynamic from/to timestamps to improve SWR cache hits across sessions.
  const perPageForRange: Record<RangeKey, number> = {
    '7d': 12, // ensure >=2 points
    '30d': 16, // ensure >=4 points
    '90d': 24, // ensure >=8 points
    '1y': 60, // ~52 points
  };

  // Window bounds: snap to start of day to stabilize keys; weekly granularity means OK.
  const toTs = dayjs().startOf('day').unix();
  const fromTs = dayjs.unix(toTs).subtract(RANGE_TO_DAYS[range], 'day').unix();

  const { data, isLoading, error } = useVaultHistoricalData({
    network: vault.network.name,
    vaultAddress: vault.address,
    apyInterval: '7day',
    fromTimestamp: fromTs,
    toTimestamp: toTs,
    perPage: perPageForRange[range],
  });

  const apyData = useMemo(() => {
    if (!data?.data) return [] as Array<{ t: string; apyPct: number }>;
    const sorted = [...data.data].sort((a: any, b: any) => a.timestamp - b.timestamp);
    return sorted.map((d: any) => ({
      t: dayjs.unix(d.timestamp).format('MMM D, YYYY'),
      apyPct: (d.apy?.total ?? 0) * 100,
    }));
  }, [data]);

  const tvlData = useMemo(() => {
    if (!data?.data) return [] as Array<{ t: string; tvlUsd: number }>;
    const sorted = [...data.data].sort((a: any, b: any) => a.timestamp - b.timestamp);
    return sorted.map((d: any) => ({
      t: dayjs.unix(d.timestamp).format('MMM D, YYYY'),
      tvlUsd: Number(d.tvl.usd || '0'),
    }));
  }, [data]);

  return (
    <Card className="rounded-lg bg-[#191919] p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center bg-white/5 rounded-lg p-1 gap-2">
          {(['apy', 'tvl'] as MetricKey[]).map((mk) => (
            <button
              key={mk}
              className={`px-3 py-1 text-xs rounded ${metric === mk ? 'bg-white text-black' : 'text-white'}`}
              onClick={() => setMetric(mk)}
            >
              {mk === 'price' ? 'Token Price' : mk.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="flex items-center bg-white/5 rounded-lg p-1 gap-1">
          {(['7d', '30d', '90d', '1y'] as RangeKey[]).map((rk) => (
            <button
              key={rk}
              className={`px-3 py-1 text-xs rounded ${range === rk ? 'bg-white text-black' : 'text-white'}`}
              onClick={() => setRange(rk)}
            >
              {rk.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* <div className="mb-4">
        <div className="text-2xl text-white font-medium">
          ${parseFloat(vault.asset.assetPriceInUsd || '0').toFixed(2)}
        </div>
        <div className="inline-flex items-center gap-2 rounded bg-[#96d18e0d] text-[#96d18e] px-3 py-1 text-xs font-bold">
          +2.64%
        </div>
      </div> */}

      <ChartContainer className="h-64 flex items-center justify-center mb-4">
        {metric === 'price' && <div className="text-gray-500">Token price chart coming soon</div>}
        {metric !== 'price' && (
          <>
            {isLoading && <div className="text-gray-500">Loading chart...</div>}
            {!isLoading && error && (
              <div className="text-red-400 text-xs">Failed to load chart</div>
            )}
            {!isLoading &&
              !error &&
              (metric === 'apy' ? apyData.length > 0 : tvlData.length > 0) &&
              (metric === 'apy' ? (
                <ApyAreaChart data={apyData} />
              ) : (
                <TvlAreaChart data={tvlData} />
              ))}
          </>
        )}
      </ChartContainer>
    </Card>
  );
}
