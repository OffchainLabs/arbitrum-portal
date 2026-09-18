import { useWalletContext } from '../WalletContext';

export function useWallets() {
  const evm = useWalletContext('evm');

  return { sourceWallet: evm, destinationWallet: evm };
}
