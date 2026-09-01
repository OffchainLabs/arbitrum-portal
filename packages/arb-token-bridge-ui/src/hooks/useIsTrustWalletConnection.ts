import { useAccount } from 'wagmi';

export function useIsTrustWalletConnection() {
  const { connector } = useAccount();

  return (connector?.name ?? '').toLowerCase().includes('trust wallet');
}
