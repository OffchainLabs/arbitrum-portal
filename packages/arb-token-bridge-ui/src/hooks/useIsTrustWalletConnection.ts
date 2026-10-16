import { useWallets } from '../wallet/hooks/useWallets';

export function useIsTrustWalletConnection() {
  const { sourceWallet } = useWallets();

  return sourceWallet.needsNetworkSigningWarning ?? false;
}
