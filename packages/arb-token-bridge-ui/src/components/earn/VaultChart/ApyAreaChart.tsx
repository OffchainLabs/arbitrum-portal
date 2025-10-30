'use client';

import { Area, AreaChart, Label, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { ChartTooltipContent } from './ChartTooltip';

export function ApyAreaChart({ data }: { data: Array<{ t: string; apyPct: number }> }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} accessibilityLayer>
        <defs>
          <linearGradient id="apyGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.5} />
            <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
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
        <YAxis domain={[0, 'auto']} tickFormatter={(v: number) => `${v.toFixed(0)}%`}>
          <Label
            angle={-90}
            position="insideLeft"
            style={{ textAnchor: 'middle' }}
            value="APY (%)"
            fill="#9CA3AF"
          />
        </YAxis>
        <Tooltip content={<ChartTooltipContent mode="apy" />} />
        <Area
          type="monotone"
          dataKey="apyPct"
          name="APY"
          stroke="#60a5fa"
          fillOpacity={1}
          fill="url(#apyGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
