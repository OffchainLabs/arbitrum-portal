import { lifiDestinationChainIds } from '../app/api/crosschain-transfers/constants';
import { getWalletEcosystem } from '../wallet/getWalletEcosystem';
import type { WalletEcosystem, WalletHandle } from '../wallet/types';

type ExecutionContext = {
  chainId: number;
  arbTokenBridgeReady: boolean;
};

const executableEcosystems: Record<WalletEcosystem, (context: ExecutionContext) => boolean> = {
  evm: ({ arbTokenBridgeReady }) => arbTokenBridgeReady,
  solana: ({ chainId }) => chainId in lifiDestinationChainIds,
};
export function isTransferExecutionSupported(chainId: number): boolean {
  try {
    return executableEcosystems[getWalletEcosystem(chainId)]({
      chainId,
      arbTokenBridgeReady: true,
    });
  } catch {
    return false;
  }
}

export function isTransferExecutionAvailable({
  chainId,
  wallet,
  arbTokenBridgeReady = true,
}: {
  chainId: number;
  wallet: WalletHandle;
  arbTokenBridgeReady?: boolean;
}): boolean {
  if (!wallet.isConnected || !wallet.account.address) return false;
  try {
    const ecosystem = getWalletEcosystem(chainId);
    return (
      wallet.ecosystem === ecosystem &&
      executableEcosystems[ecosystem]({ chainId, arbTokenBridgeReady })
    );
  } catch {
    return false;
  }
}
