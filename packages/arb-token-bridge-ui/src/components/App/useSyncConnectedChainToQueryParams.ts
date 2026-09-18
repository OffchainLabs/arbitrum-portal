import { useCallback, useEffect, useState } from 'react';

import { useAccountType } from '../../hooks/useAccountType';
import { DisabledFeatures, useArbQueryParams } from '../../hooks/useArbQueryParams';
import { useDisabledFeatures } from '../../hooks/useDisabledFeatures';
import { sanitizeQueryParams } from '../../hooks/useNetworks';
import { useWallets } from '../../wallet/hooks/useWallets';

export function useSyncConnectedChainToQueryParams() {
  const { sourceWallet } = useWallets();
  const chainId = sourceWallet.account.chainId;
  const { accountType } = useAccountType(sourceWallet.account.address, chainId);
  const [shouldSync, setShouldSync] = useState(false);
  const [didSync, setDidSync] = useState(false);
  const { isFeatureDisabled } = useDisabledFeatures();

  const [{ sourceChain, destinationChain }, setQueryParams] = useArbQueryParams();

  const disableTransfersToNonArbitrumChains = isFeatureDisabled(
    DisabledFeatures.TRANSFERS_TO_NON_ARBITRUM_CHAINS,
  );

  const setSourceChainToConnectedChain = useCallback(() => {
    if (!chainId) {
      return;
    }

    const { sourceChainId: sourceChain, destinationChainId: destinationChain } =
      sanitizeQueryParams({
        sourceChainId: chainId,
        destinationChainId: undefined,
        disableTransfersToNonArbitrumChains,
      });

    setQueryParams({ sourceChain, destinationChain });
  }, [chainId, setQueryParams, disableTransfersToNonArbitrumChains]);

  useEffect(() => {
    if (!chainId || sourceChain === undefined || accountType !== 'smart-contract-wallet') {
      return;
    }

    if (sourceChain !== chainId) {
      setSourceChainToConnectedChain();
    }
  }, [accountType, chainId, setSourceChainToConnectedChain, sourceChain]);

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
    if (chainId && shouldSync && !didSync) {
      setSourceChainToConnectedChain();
      setDidSync(true);
    }
  }, [chainId, shouldSync, didSync, setSourceChainToConnectedChain]);
}
