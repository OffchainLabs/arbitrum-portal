import { useCallback, useEffect, useState } from 'react';
import { useAccount } from 'wagmi';

import { useAccountType } from '../../hooks/useAccountType';
import { DisabledFeatures, useArbQueryParams } from '../../hooks/useArbQueryParams';
import { useDisabledFeatures } from '../../hooks/useDisabledFeatures';
import { sanitizeQueryParams } from '../../hooks/useNetworks';

export function useSyncConnectedChainToQueryParams() {
  const { chain } = useAccount();
  const { accountType } = useAccountType(undefined, chain?.id);
  const [shouldSync, setShouldSync] = useState(false);
  const [didSync, setDidSync] = useState(false);
  const { isFeatureDisabled } = useDisabledFeatures();

  const [{ sourceChain, destinationChain }, setQueryParams] = useArbQueryParams();

  const disableTransfersToNonArbitrumChains = isFeatureDisabled(
    DisabledFeatures.TRANSFERS_TO_NON_ARBITRUM_CHAINS,
  );

  const setSourceChainToConnectedChain = useCallback(() => {
    if (!chain) {
      return;
    }

    const { sourceChainId: sourceChain, destinationChainId: destinationChain } =
      sanitizeQueryParams({
        sourceChainId: chain.id,
        destinationChainId: undefined,
        disableTransfersToNonArbitrumChains,
      });

    setQueryParams({ sourceChain, destinationChain });
  }, [chain, setQueryParams, disableTransfersToNonArbitrumChains]);

  useEffect(() => {
    if (!chain || sourceChain === undefined || accountType !== 'smart-contract-wallet') {
      return;
    }

    if (sourceChain !== chain.id) {
      setSourceChainToConnectedChain();
    }
  }, [accountType, chain, setSourceChainToConnectedChain, sourceChain]);

  useEffect(() => {
    if (shouldSync) {
      return;
    }

    // Only sync connected chain to query params if the query params were not initially provided
    if (sourceChain === undefined && destinationChain === undefined) {
      setShouldSync(true);
    }
  }, [shouldSync, sourceChain, destinationChain]);

  useEffect(() => {
    // When the chain is connected and we should sync, and we haven't synced yet, sync the connected chain to the query params
    if (chain && shouldSync && !didSync) {
      setSourceChainToConnectedChain();
      setDidSync(true);
    }
  }, [chain, shouldSync, didSync, setSourceChainToConnectedChain]);
}
