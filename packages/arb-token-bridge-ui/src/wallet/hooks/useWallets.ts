import { useNetworks } from '../../hooks/useNetworks';
import { useWalletContext } from '../WalletContext';
import { getWalletEcosystem } from '../getWalletEcosystem';

export function useWallets() {
  const [{ sourceChain, destinationChain }] = useNetworks();
  const evm = useWalletContext('evm');
  const solana = useWalletContext('solana');

  return {
    sourceWallet: getWalletEcosystem(sourceChain.id) === 'solana' ? solana : evm,
    destinationWallet: getWalletEcosystem(destinationChain.id) === 'solana' ? solana : evm,
  };
}
