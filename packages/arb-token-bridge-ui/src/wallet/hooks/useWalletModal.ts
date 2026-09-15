import { useAppKit } from '@reown/appkit/react';
import { useCallback } from 'react';

import { additionalSourceChainIds } from '@/app/src/walletConfig';

import { useNetworks } from '../../hooks/useNetworks';
import { ChainId } from '../../types/ChainId';
import { appKit } from '../../util/wagmi/setup';

export function useWalletModal() {
  const { open } = useAppKit();
  const [networks] = useNetworks();

  const openConnectModal = useCallback(
    async (chainId: number = networks.sourceChain.id) => {
      if (chainId === ChainId.Solana) {
        if (!additionalSourceChainIds.includes(ChainId.Solana)) return;
        await open({ view: 'Connect', namespace: 'solana' });
        return;
      }
      if (appKit && networks.sourceChain) {
        const caipNetwork = appKit.getCaipNetwork('eip155', chainId);
        if (caipNetwork) {
          appKit.setCaipNetwork(caipNetwork);
        }
      }
      await open({ view: 'Connect', namespace: 'eip155' });
    },
    [networks.sourceChain, open],
  );

  return {
    openConnectModal,
  };
}
