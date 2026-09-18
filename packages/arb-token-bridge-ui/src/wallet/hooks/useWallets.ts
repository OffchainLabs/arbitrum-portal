import { useContext } from 'react';

import { useNetworks } from '../../hooks/useNetworks';
import { WalletContext } from '../WalletContext';
import { getWalletEcosystem } from '../getWalletEcosystem';
import { selectWallets } from '../selectWallets';
import type { WalletEcosystem, WalletHandle } from '../types';

export function useWalletForChain(chainId: number) {
  return useContext(WalletContext)[getWalletEcosystem(chainId)];
}

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

export function useWalletAddressForChain(chainId: number): string | undefined {
  const wallets = useContext(WalletContext);
  let ecosystem: WalletEcosystem;
  try {
    ecosystem = getWalletEcosystem(chainId);
  } catch {
    // Connected wallets can report chains outside the bridge's network registry.
    return undefined;
  }
  return wallets[ecosystem].account.address;
}
