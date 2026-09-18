import { shortenAddress } from '../../util/CommonUtils';
import { getChainMetadata } from '../../util/networkMetadata';
import { useWalletForChain } from '../../wallet/hooks/useWallets';
import { SafeImage } from '../common/SafeImage';

export function NetworkWalletButton({ chainId }: { chainId: number }) {
  const {
    account: { address, walletInfo },
    isConnected,
  } = useWalletForChain(chainId);

  if (!isConnected || !address) {
    return null;
  }

  const chain = getChainMetadata(chainId);
  return (
    <div className="flex min-w-0 items-center gap-2 text-xs text-white/70">
      <SafeImage src={walletInfo?.icon} alt={walletInfo?.name} className="h-4 w-4 rounded-sm" />
      <span title={address}>
        {chain.name}: {shortenAddress(address)}
      </span>
    </div>
  );
}
