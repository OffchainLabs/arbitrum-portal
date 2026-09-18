import { useContext } from 'react';

import { useNetworks } from '../../hooks/useNetworks';
import { WalletContext } from '../WalletContext';
import { getWalletEcosystem } from '../getWalletEcosystem';
import { selectWallets } from '../selectWallets';
import type { WalletEcosystem, WalletHandle } from '../types';

export function useWallets() {
  const [{ sourceChain, destinationChain }] = useNetworks();
  const wallets = useContext(WalletContext);

  return selectWallets<WalletEcosystem, WalletHandle>({
    wallets,
    sourceChainId: sourceChain.id,
    destinationChainId: destinationChain.id,
    getEcosystem: getWalletEcosystem,
  });
}
