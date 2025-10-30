'use client';

import { Area, AreaChart, Label, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { ChartTooltipContent } from './ChartTooltip';

export function TvlAreaChart({ data }: { data: Array<{ t: string; tvlUsd: number }> }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} accessibilityLayer>
        <defs>
          <linearGradient id="tvlGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#34d399" stopOpacity={0.5} />
            <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="t"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          allowDuplicatedCategory={false}
        >
          <Label value="Date" position="insideBottom" dy={10} fill="#9CA3AF" />
        </XAxis>
        <YAxis
          domain={[0, 'auto']}
          tickFormatter={(v: number) => `$${(v / 1_000_000).toFixed(1)}M`}
        >
          <Label
            angle={-90}
            position="insideLeft"
            style={{ textAnchor: 'middle' }}
            value="TVL (USD)"
            fill="#9CA3AF"
          />
        </YAxis>
        <Tooltip content={<ChartTooltipContent mode="tvl" />} />
        <Area
          type="monotone"
          dataKey="tvlUsd"
          name="TVL"
          stroke="#34d399"
          fillOpacity={1}
          fill="url(#tvlGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
