'use client';

import type { TooltipProps } from 'recharts';

type Mode = 'apy' | 'tvl';

export function ChartTooltipContent(props: TooltipProps<number, string> & { mode?: Mode }) {
  const { active } = props as { active?: boolean };
  const payload = (props as any).payload as Array<{ name: string; value: number }> | undefined;
  const label = (props as any).label as string | undefined;
  const mode = (props as any).mode as Mode | undefined;
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-md border border-white/10 bg-[#191919] p-2 text-xs text-white shadow">
      {label && <div className="mb-1 text-white/70">{label}</div>}
      {payload.map((p: { name: string; value: number }, i: number) => {
        const raw = Number(p.value ?? 0);
        const formatted = mode === 'apy' ? `${raw.toFixed(2)}%` : `$${raw.toLocaleString()}`;
        return (
          <div key={i} className="flex items-center justify-between gap-4">
            <span className="text-white/70">{p.name}</span>
            <span>{formatted}</span>
          </div>
        );
      })}
    </div>
  );
}
