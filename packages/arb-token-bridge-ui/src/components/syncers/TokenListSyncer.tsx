import { useEffect } from 'react';

import { useNetworks } from '../../hooks/useNetworks';
import { useNetworksRelationship } from '../../hooks/useNetworksRelationship';
import { useAppState } from '../../state';
import { addBridgeTokenListToBridge, getDefaultBridgeTokenLists } from '../../util/TokenListUtils';

// Adds whitelisted tokens to the bridge data on app load
// In the token list we should show later only tokens with positive balances
const TokenListSyncer = (): React.JSX.Element => {
  const {
    app: { arbTokenBridge, arbTokenBridgeLoaded },
  } = useAppState();
  const [networks] = useNetworks();
  const { childChain, parentChain } = useNetworksRelationship(networks);

  useEffect(() => {
    if (!arbTokenBridgeLoaded) {
      return;
    }

    const tokenListsToSet = getDefaultBridgeTokenLists({
      childChainId: childChain.id,
      parentChainId: parentChain.id,
    });

    tokenListsToSet.forEach((bridgeTokenList) => {
      addBridgeTokenListToBridge(bridgeTokenList, arbTokenBridge);
    });
  }, [
    // arbTokenBridge.token is not a memoized object, adding it here would cause infinite loop
    childChain.id,
    parentChain.id,
    arbTokenBridgeLoaded,
  ]);

  return <></>;
};

export { TokenListSyncer };
