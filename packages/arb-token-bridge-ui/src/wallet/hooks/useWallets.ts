import { useNetworks } from '../../hooks/useNetworks';
import { ChainId } from '../../types/ChainId';
import { isSolanaEnabled } from '../../util/featureFlag';
import { useWalletContext } from '../providers/WalletProvider';
import type { WalletHandle } from '../types';

export function useWallets(): {
  sourceWallet: WalletHandle;
  destinationWallet: WalletHandle;
} {
  const [networks] = useNetworks();
  const evmWalletContext = useWalletContext('evm');
  const solanaWalletContext = useWalletContext('solana');

  const getWalletForChainId = (chainId: number): WalletHandle => {
    const wallet =
      chainId === ChainId.Solana && isSolanaEnabled() ? solanaWalletContext : evmWalletContext;

    // Expose one caller API while preserving the provider wallet and its transaction implementation.
    return wallet as WalletHandle;
  };

  return {
    sourceWallet: getWalletForChainId(networks.sourceChain.id),
    destinationWallet: getWalletForChainId(networks.destinationChain.id),
  };
}
