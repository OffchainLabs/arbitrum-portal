import { useWalletInfo } from '@reown/appkit/react';
import * as Sentry from '@sentry/react';
import { useEffect } from 'react';
import { useAccount } from 'wagmi';

import { useNetworks } from '../../hooks/useNetworks';
import { useNetworksRelationship } from '../../hooks/useNetworksRelationship';
import { trackEvent } from '../../util/AnalyticsUtils';
import { rpcURLs } from '../../util/networks';

/** given our RPC url, sanitize it before logging to Sentry, to only pass the url and not the keys */
function getBaseUrl(url: string | undefined): string | null {
  if (typeof url === 'undefined') {
    return null;
  }

  try {
    const urlObject = new URL(url);
    return `${urlObject.protocol}//${urlObject.hostname}`;
  } catch {
    // if invalid url passed
    return null;
  }
}

export function useSyncConnectedChainToAnalytics() {
  const [networks] = useNetworks();
  const { parentChain, childChain } = useNetworksRelationship(networks);
  const { isConnected } = useAccount();
  const { walletInfo } = useWalletInfo('eip155');

  useEffect(() => {
    if (isConnected) {
      const walletName = walletInfo?.name ?? 'Other';
      trackEvent('Connect Wallet Click', { walletName });

      // Set wallet name tag only when we have a connected wallet
      Sentry.setTag('wallet.name', walletName);
    } else {
      // If no wallet is connected, explicitly set the tag to 'not_connected'
      // This prevents it from showing as '<invalid>' in Sentry
      Sentry.setTag('wallet.name', 'not_connected');
    }
  }, [isConnected, walletInfo?.name]);

  useEffect(() => {
    Sentry.setTag('network.parent_chain_id', parentChain.id);
    Sentry.setTag('network.child_chain_id', childChain.id);

    const parentChainRpcUrl = getBaseUrl(rpcURLs[parentChain.id]);
    const childChainRpcUrl = getBaseUrl(rpcURLs[childChain.id]);

    if (parentChainRpcUrl) {
      Sentry.setTag('network.parent_chain_rpc_url', parentChainRpcUrl);
    }

    if (childChainRpcUrl) {
      Sentry.setTag('network.child_chain_rpc_url', childChainRpcUrl);
    }
  }, [childChain.id, parentChain.id]);
}
