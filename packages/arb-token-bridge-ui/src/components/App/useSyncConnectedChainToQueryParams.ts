import { useDisconnect } from '@reown/appkit/react';
import { useCallback, useEffect, useState } from 'react';

import { useWallets } from '@/bridge/wallet/hooks/useWallets';

import { useAccountType } from '../../hooks/useAccountType';
import { DisabledFeatures, useArbQueryParams } from '../../hooks/useArbQueryParams';
import { useDisabledFeatures } from '../../hooks/useDisabledFeatures';
import { sanitizeQueryParams } from '../../hooks/useNetworks';
import { getAccountType } from '../../util/AccountUtils';
import { isSolanaEnabled } from '../../util/featureFlag';
import { getNetworkName } from '../../util/networks';

export function useSyncConnectedChainToQueryParams() {
  const { sourceWallet } = useWallets();
  const { address, chain } = sourceWallet.account;
  const { accountType } = useAccountType(undefined, chain?.id);
  const [shouldSync, setShouldSync] = useState(false);
  const [didSync, setDidSync] = useState(false);
  const { disconnect } = useDisconnect();
  const { isFeatureDisabled } = useDisabledFeatures();

  const [{ sourceChain, destinationChain }, setQueryParams] = useArbQueryParams();

  const disableTransfersToNonArbitrumChains = isFeatureDisabled(
    DisabledFeatures.TRANSFERS_TO_NON_ARBITRUM_CHAINS,
  );

  const shouldDisableConnectedChainSync = isSolanaEnabled();

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
    if (shouldDisableConnectedChainSync) {
      return;
    }

    if (!chain || sourceChain === undefined || accountType !== 'smart-contract-wallet') {
      return;
    }

    if (sourceChain !== chain.id) {
      setSourceChainToConnectedChain();
    }
  }, [
    accountType,
    chain,
    setSourceChainToConnectedChain,
    shouldDisableConnectedChainSync,
    sourceChain,
  ]);

  useEffect(() => {
    if (shouldDisableConnectedChainSync || typeof chain === 'undefined' || !address) {
      return;
    }

    if (sourceChain === chain.id) {
      return;
    }

    async function checkCorrectChainForSmartContractWallet() {
      const connectedAccountType = await getAccountType({
        address: address,
        chainId: chain.id,
      });

      if (connectedAccountType !== 'smart-contract-wallet') {
        return;
      }

      const chainName = getNetworkName(chain.id);

      setSourceChainToConnectedChain();

      window.alert(
        `You're connected to the app with a smart contract wallet on ${chainName}. In order to properly enable transfers, the app will now reload.\n\nPlease reconnect after the reload.`,
      );
      await disconnect({ namespace: 'eip155' });
    }

    void checkCorrectChainForSmartContractWallet();
  }, [
    address,
    chain,
    disconnect,
    setSourceChainToConnectedChain,
    shouldDisableConnectedChainSync,
    sourceChain,
  ]);

  useEffect(() => {
    if (shouldDisableConnectedChainSync) {
      return;
    }

    if (shouldSync) {
      return;
    }

    // Only sync connected chain to query params if the query params were not initially provided
    if (sourceChain === undefined && destinationChain === undefined) {
      setShouldSync(true);
    }
  }, [destinationChain, shouldDisableConnectedChainSync, shouldSync, sourceChain]);

  useEffect(() => {
    if (shouldDisableConnectedChainSync) {
      return;
    }

    // When the chain is connected and we should sync, and we haven't synced yet, sync the connected chain to the query params
    if (chain && shouldSync && !didSync) {
      setSourceChainToConnectedChain();
      setDidSync(true);
    }
  }, [chain, didSync, setSourceChainToConnectedChain, shouldDisableConnectedChainSync, shouldSync]);
}
