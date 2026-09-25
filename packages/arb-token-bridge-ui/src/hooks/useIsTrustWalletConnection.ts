import { useWallets } from '../wallet/hooks/useWallets';

export function useIsTrustWalletConnection() {
  const { sourceWallet } = useWallets();
  return (sourceWallet.account.walletInfo?.name ?? '').toLowerCase().includes('trust wallet');
}
