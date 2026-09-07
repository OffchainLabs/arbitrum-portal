import { useCallback } from 'react';
import { useConnect, useConnectors } from 'wagmi';

export function useWalletModal() {
  const { connect } = useConnect();
  const connectors = useConnectors();

  const openConnectModal = useCallback(() => {
    // The documented ZD kit entry point: connecting the 'zerodev-wallet'
    // connector surfaces the kit's connect UI when no session exists and
    // resolves once the user finishes. Picking an external wallet inside the
    // UI connects that wallet instead and settles this mutation as
    // 'Auth flow dismissed' — expected, wagmi ends up connected either way.
    const zeroDevConnector = connectors.find((c) => c.id === 'zerodev-wallet');

    if (zeroDevConnector) {
      connect({ connector: zeroDevConnector });
    }
  }, [connect, connectors]);

  return {
    openConnectModal,
  };
}
