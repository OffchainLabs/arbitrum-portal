import { useEffect, useMemo, useState } from 'react';

import { TokenBridgeParams } from '../../hooks/useArbTokenBridge';
import { useNetworks } from '../../hooks/useNetworks';
import { useNetworksRelationship } from '../../hooks/useNetworksRelationship';
import { useActions } from '../../state';
import { getProviderForChainId } from '../../token-bridge-sdk/utils';
import { getWalletEcosystem } from '../../wallet/getWalletEcosystem';

export function useArbTokenBridgeBootstrap(): TokenBridgeParams | null {
  const actions = useActions();
  const [networks] = useNetworks();
  const { childChain, parentChain } = useNetworksRelationship(networks);
  const [tokenBridgeParams, setTokenBridgeParams] = useState<TokenBridgeParams | null>(null);
  const nextTokenBridgeParams = useMemo<TokenBridgeParams | null>(
    () => {
      // The token bridge store reads both chains through EVM providers. It still loads for EVM
      // chains that only reach Arbitrum through LiFi, such as Elysium, to hold their token lists
      if (getWalletEcosystem(parentChain.id) !== getWalletEcosystem(childChain.id)) {
        return null;
      }

      return {
        l1: {
          network: parentChain,
          provider: getProviderForChainId(parentChain.id),
        },
        l2: {
          network: childChain,
          provider: getProviderForChainId(childChain.id),
        },
      };
    },
    // Chain object references can be unstable for the same chain ID.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [parentChain.id, childChain.id],
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
