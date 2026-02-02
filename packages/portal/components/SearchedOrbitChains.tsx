import { OrbitChain } from '@/common/types';

import { OrbitItemBox } from './OrbitItemBox';

export const SearchedOrbitChains = ({ orbitChains }: { orbitChains: OrbitChain[] }) => {
  const orbitChainsCount = orbitChains.length;
  if (!orbitChainsCount) return null;

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 text-xl">
        <div>Arbitrum Chains</div>
        <span className="min-h-6 min-w-6 flex items-center justify-center rounded-full bg-white/20 p-1 px-3 text-center text-xs text-white/50">
          {orbitChainsCount}
        </span>
      </div>
      <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
        {orbitChains.map((orbitChain) => (
          <OrbitItemBox slug={orbitChain.slug} key={orbitChain.slug} />
        ))}
      </div>
    </div>
  );
};
