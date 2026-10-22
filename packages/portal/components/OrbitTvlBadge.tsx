import { useMemo } from 'react';
import { twMerge } from 'tailwind-merge';

import { getTvlForOrbitChain } from '@/common/orbitChains';

const formatter = Intl.NumberFormat('en', { notation: 'compact' });

export const OrbitTvlBadge = ({ slug }: { slug: string }) => {
  const tvl = useMemo(() => getTvlForOrbitChain(slug), [slug]);

  if (!tvl) return null;

  return (
    <span
      className={twMerge(
        'inline-flex items-start justify-start gap-2 wrap-break-word rounded bg-white/25 px-1.5 py-0.5 text-xs font-normal capitalize text-white',
      )}
    >
      ${formatter.format(tvl)} TVL
    </span>
  );
};
