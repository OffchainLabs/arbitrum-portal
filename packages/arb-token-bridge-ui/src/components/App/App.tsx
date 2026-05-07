import axios from 'axios';
import React, { useEffect } from 'react';

import { useCCTPIsBlocked } from '../../hooks/CCTP/useCCTPIsBlocked';
import { useTheme } from '../../hooks/useTheme';
import { useActions } from '../../state';
import { logger } from '../../util/logger';
import { MainContent } from '../MainContent/MainContent';
import { ArbTokenBridgeStoreSync } from '../syncers/ArbTokenBridgeStoreSync';
import { TokenListSyncer } from '../syncers/TokenListSyncer';
import { useArbTokenBridgeBootstrap } from './useArbTokenBridgeBootstrap';
import { useSyncConnectedChainToAnalytics } from './useSyncConnectedChainToAnalytics';
import { useSyncConnectedChainToQueryParams } from './useSyncConnectedChainToQueryParams';

declare global {
  interface Window {
    Cypress?: unknown;
  }
}

const ArbTokenBridgeStoreSyncWrapper = (): JSX.Element | null => {
  const actions = useActions();
  const tokenBridgeParams = useArbTokenBridgeBootstrap();

  // We want to be sure this fetch is completed by the time we open the USDC modals
  useCCTPIsBlocked();

  useSyncConnectedChainToAnalytics();
  useSyncConnectedChainToQueryParams();

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
