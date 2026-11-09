import { useWalletInfo } from '@zerodev/wallet-react-ui';

export function useIsTrustWalletConnection() {
  const { walletInfo } = useWalletInfo();

  return (walletInfo?.name ?? '').toLowerCase().includes('trust wallet');
}
