import { ARB_NETWORKS, ORBIT_NETWORKS_IN_FILTERS } from '@/common/chains';

import { NetworkOption } from './NetworkOption';

export const NetworkOptionList = () => {
  return (
    <div className="flex flex-col gap-4 text-left">
      <div className="flex flex-col">
        <span className="p-2 opacity-50">Core Chains</span>
        {ARB_NETWORKS.map((network) => (
          <NetworkOption network={network} key={network.slug} />
        ))}
      </div>

      {ORBIT_NETWORKS_IN_FILTERS.length ? (
        <>
          <hr className="opacity-20" />

          <div className="flex flex-col">
            <span className="p-2 opacity-50">Orbit Chains</span>
            {ORBIT_NETWORKS_IN_FILTERS.map((network) => (
              <NetworkOption network={network} key={network.slug} />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
};
