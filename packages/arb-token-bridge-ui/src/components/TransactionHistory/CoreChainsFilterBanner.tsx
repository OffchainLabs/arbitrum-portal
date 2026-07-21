import { InformationCircleIcon } from '@heroicons/react/24/outline';

import { getNetworkName } from '../../util/networks';
import { useTxHistoryChainFilter } from './useTransactionHistoryChainFilter';

/**
 * Explains the default core-only scope of the transaction history. Only shown
 * while the "All Core Chains" default is active — once the user picks a
 * specific chain, the filter label already says what is shown.
 */
export function CoreChainsFilterBanner() {
  const filter = useTxHistoryChainFilter();

  if (filter.type !== 'all-core') {
    return null;
  }

  const coreChainNames = filter.coreChainIds.map(getNetworkName).join(', ');

  return (
    <div className="mb-4 flex items-center gap-2 rounded-md bg-bright-blue/20 p-2 text-sm text-white">
      <InformationCircleIcon className="h-4 w-4 shrink-0" />
      <span>
        Only transactions between core chains ({coreChainNames}) are shown by default. To view
        another chain&apos;s transactions, select it from the filter.
      </span>
    </div>
  );
}
