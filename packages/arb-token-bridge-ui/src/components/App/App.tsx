import axios from 'axios';
import React, { useEffect, useMemo, useState } from 'react';

import { useCCTPIsBlocked } from '../../hooks/CCTP/useCCTPIsBlocked';
import { TokenBridgeParams } from '../../hooks/useArbTokenBridge';
import { useNetworks } from '../../hooks/useNetworks';
import { useNetworksRelationship } from '../../hooks/useNetworksRelationship';
import { useTheme } from '../../hooks/useTheme';
import { useActions } from '../../state';
import { logger } from '../../util/logger';
import { MainContent } from '../MainContent/MainContent';
import { ArbTokenBridgeStoreSync } from '../syncers/ArbTokenBridgeStoreSync';
import { TokenListSyncer } from '../syncers/TokenListSyncer';
import { useSyncConnectedChainToAnalytics } from './useSyncConnectedChainToAnalytics';
import { useSyncConnectedChainToQueryParams } from './useSyncConnectedChainToQueryParams';

declare global {
  interface Window {
    Cypress?: unknown;
  }
}

const ArbTokenBridgeStoreSyncWrapper = (): JSX.Element | null => {
  const actions = useActions();
  const [networks] = useNetworks();
  const { childChain, childChainProvider, parentChain, parentChainProvider } =
    useNetworksRelationship(networks);

  // We want to be sure this fetch is completed by the time we open the USDC modals
  useCCTPIsBlocked();

  useSyncConnectedChainToAnalytics();
  useSyncConnectedChainToQueryParams();

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

  // Listen for account and network changes
  useEffect(() => {
    // Any time one of those changes
    setTokenBridgeParams(null);

    actions.app.reset();
    actions.app.setChainIds({
      l1NetworkChainId: parentChain.id,
      l2NetworkChainId: childChain.id,
    });

    setTokenBridgeParams(nextTokenBridgeParams);
  }, [actions.app, parentChain.id, childChain.id, nextTokenBridgeParams]);

  useEffect(() => {
    axios
      .get(
        'https://raw.githubusercontent.com/OffchainLabs/arb-token-lists/aff40a59608678cfd9b034dd198011c90b65b8b6/src/WarningList/warningTokens.json',
      )
      .then((res) => {
        actions.app.setWarningTokens(res.data);
      })
      .catch((err) => {
        logger.warn('Failed to fetch warning tokens:', err);
      });
  }, [actions.app]);

  if (!tokenBridgeParams) {
    return null;
  }

  return <ArbTokenBridgeStoreSync tokenBridgeParams={tokenBridgeParams} />;
};

const AppContent = React.memo(() => {
  // apply custom themes if any
  useTheme();

  return (
    <>
      <TokenListSyncer />
      <ArbTokenBridgeStoreSyncWrapper />
      <MainContent />
    </>
  );
});

AppContent.displayName = 'AppContent';

export default function App() {
  return <AppContent />;
}
