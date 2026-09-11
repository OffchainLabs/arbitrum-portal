import { useWalletContext } from '../providers/WalletProvider';

export function useWallets() {
  const evm = useWalletContext('evm');

  return { sourceWallet: evm, destinationWallet: evm };
}
