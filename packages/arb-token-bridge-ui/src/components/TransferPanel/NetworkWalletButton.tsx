import { shortenAddress } from '../../util/CommonUtils';
import { useAccountMenu } from '../../wallet/hooks/useAccountMenu';

export function NetworkWalletButton({ chainId }: { chainId: number }) {
  const { address, chain, isConnected, disconnect, openConnectModal } = useAccountMenu(chainId);
  return (
    <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 text-xs text-white/70">
      {isConnected && address ? (
        <>
          <span title={address}>
            {chain.name}: {shortenAddress(address)}
          </span>
          <button
            type="button"
            className="arb-hover underline"
            onClick={disconnect}
            aria-label={`Disconnect ${chain.name} wallet`}
          >
            Disconnect
          </button>
        </>
      ) : (
        <button type="button" className="arb-hover underline" onClick={openConnectModal}>
          Connect {chain.name} wallet
        </button>
      )}
    </div>
  );
}
