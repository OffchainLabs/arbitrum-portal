import { useContext } from 'react';

import { useNetworks } from '../../hooks/useNetworks';
import { WalletContext } from '../WalletContext';
import { getWalletEcosystem } from '../getWalletEcosystem';

export function useWalletForChain(chainId: number) {
  return useContext(WalletContext)[getWalletEcosystem(chainId)];
}

export function useWallets() {
  const [{ sourceChain, destinationChain }] = useNetworks();
  const wallets = useContext(WalletContext);

  return {
    sourceWallet: wallets[getWalletEcosystem(sourceChain.id)],
    destinationWallet: wallets[getWalletEcosystem(destinationChain.id)],
  };
}
