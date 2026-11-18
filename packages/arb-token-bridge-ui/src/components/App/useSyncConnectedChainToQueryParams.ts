import { useCallback, useEffect, useState } from 'react';

import { useAccountType } from '../../hooks/useAccountType';
import { DisabledFeatures, useArbQueryParams } from '../../hooks/useArbQueryParams';
import { useDisabledFeatures } from '../../hooks/useDisabledFeatures';
import { sanitizeQueryParams } from '../../hooks/useNetworks';
import { useWallets } from '../../wallet/hooks/useWallets';

export function useSyncConnectedChainToQueryParams() {
  // A smart contract wallet can only send from its own chain. Only the source wallet sends,
  // so a Safe connected as the destination of a Solana route doesn't move the source chain.
  const {
    sourceWallet: {
      account: { address: sourceWalletAddress, chainId: sourceWalletChainId },
    },
  } = useWallets();
  const { accountType } = useAccountType(sourceWalletAddress, sourceWalletChainId);
  const [shouldSync, setShouldSync] = useState(false);
  const [didSync, setDidSync] = useState(false);
  const { isFeatureDisabled } = useDisabledFeatures();

  const [{ sourceChain, destinationChain }, setQueryParams] = useArbQueryParams();

  const disableTransfersToNonArbitrumChains = isFeatureDisabled(
    DisabledFeatures.TRANSFERS_TO_NON_ARBITRUM_CHAINS,
  );

  const setSourceChainToConnectedChain = useCallback(
    (connectedChainId: number) => {
      const { sourceChainId: sourceChain, destinationChainId: destinationChain } =
        sanitizeQueryParams({
          sourceChainId: connectedChainId,
          destinationChainId: undefined,
          disableTransfersToNonArbitrumChains,
        });

      setQueryParams({ sourceChain, destinationChain });
    },
    [setQueryParams, disableTransfersToNonArbitrumChains],
  );

  useEffect(() => {
    if (
      !sourceWalletChainId ||
      sourceChain === undefined ||
      accountType !== 'smart-contract-wallet'
    ) {
      return;
    }

    if (sourceChain !== sourceWalletChainId) {
      setSourceChainToConnectedChain(sourceWalletChainId);
    }
  }, [accountType, sourceWalletChainId, setSourceChainToConnectedChain, sourceChain]);

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
    if (sourceWalletChainId && shouldSync && !didSync) {
      setSourceChainToConnectedChain(sourceWalletChainId);
      setDidSync(true);
    }
  }, [sourceWalletChainId, shouldSync, didSync, setSourceChainToConnectedChain]);
}
