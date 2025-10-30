'use client';

import { twMerge } from 'tailwind-merge';

export function ChartContainer({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={twMerge('w-full min-h-[200px] rounded-lg bg-[#191919]', className)}>
      {children}
    </div>
  );
}
