import { useEffect, useMemo, useState } from 'react';

import { TokenBridgeParams } from '../../hooks/useArbTokenBridge';
import { useNetworks } from '../../hooks/useNetworks';
import { useNetworksRelationship } from '../../hooks/useNetworksRelationship';
import { useActions } from '../../state';

export function useArbTokenBridgeBootstrap(): TokenBridgeParams | null {
  const actions = useActions();
  const [networks] = useNetworks();
  const { childChain, childChainProvider, parentChain, parentChainProvider } =
    useNetworksRelationship(networks);
  const [tokenBridgeParams, setTokenBridgeParams] = useState<TokenBridgeParams | null>(null);
  const nextTokenBridgeParams = useMemo<TokenBridgeParams>(
    () => ({
      l1: {
        network: parentChain,
        provider: parentChainProvider,
      },
      l2: {
        network: childChain,
        provider: childChainProvider,
      },
    }),
    // Chain object references can be unstable for the same chain ID.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [parentChain.id, childChain.id, parentChainProvider, childChainProvider],
  );

  useEffect(() => {
    setTokenBridgeParams(null);

    actions.app.reset();
    actions.app.setChainIds({
      l1NetworkChainId: parentChain.id,
      l2NetworkChainId: childChain.id,
    });

    setTokenBridgeParams(nextTokenBridgeParams);
  }, [actions.app, parentChain.id, childChain.id, nextTokenBridgeParams]);

  return tokenBridgeParams;
}
