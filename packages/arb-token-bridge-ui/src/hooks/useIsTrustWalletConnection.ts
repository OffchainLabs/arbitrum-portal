import { useWalletInfo } from '@reown/appkit/react';

export function useIsTrustWalletConnection() {
  const { walletInfo } = useWalletInfo('eip155');

  return (walletInfo?.name ?? '').toLowerCase().includes('trust wallet');
}
