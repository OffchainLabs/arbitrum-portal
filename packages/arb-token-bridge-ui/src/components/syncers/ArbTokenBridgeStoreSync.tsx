import { useEffect } from 'react';

import { type TokenBridgeParams, useArbTokenBridge } from '../../hooks/useArbTokenBridge';
import { useActions } from '../../state';

// Syncs the arbTokenBridge data with the global store, so we dont have to drill with props but use store hooks to get data
function ArbTokenBridgeStoreSyncForChainPair({
  tokenBridgeParams,
}: {
  tokenBridgeParams: TokenBridgeParams;
}): React.JSX.Element {
  const actions = useActions();
  const arbTokenBridge = useArbTokenBridge(tokenBridgeParams);

  useEffect(() => {
    actions.app.setArbTokenBridge(arbTokenBridge);
  }, [actions.app, arbTokenBridge]);

  return <></>;
}

export function ArbTokenBridgeStoreSync({
  tokenBridgeParams,
}: {
  tokenBridgeParams: TokenBridgeParams;
}): React.JSX.Element {
  const chainPairKey = `${tokenBridgeParams.l1.network.id}:${tokenBridgeParams.l2.network.id}`;

  return (
    <ArbTokenBridgeStoreSyncForChainPair key={chainPairKey} tokenBridgeParams={tokenBridgeParams} />
  );
}
