import { useNetworks } from '../../hooks/useNetworks';
import { isNetwork } from '../../util/networks';
import { useWalletContext } from '../WalletContext';

export function useWallets() {
  const [{ sourceChain, destinationChain }] = useNetworks();
  const evm = useWalletContext('evm');
  const solana = useWalletContext('solana');

  return {
    sourceWallet: isNetwork(sourceChain.id).isSolana ? solana : evm,
    destinationWallet: isNetwork(destinationChain.id).isSolana ? solana : evm,
  };
}
