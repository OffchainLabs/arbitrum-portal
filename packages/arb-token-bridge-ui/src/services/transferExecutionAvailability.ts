import { getWalletEcosystem } from '../wallet/getWalletEcosystem';
import type { WalletEcosystem, WalletHandle } from '../wallet/types';

const executableEcosystems: Partial<Record<WalletEcosystem, boolean>> = { evm: true };
export function isTransferExecutionAvailable({
  chainId,
  wallet,
}: {
  chainId: number;
  wallet: WalletHandle;
}): boolean {
  if (!wallet.isConnected || !wallet.account.address) return false;
  try {
    const ecosystem = getWalletEcosystem(chainId);
    return wallet.ecosystem === ecosystem && executableEcosystems[ecosystem] === true;
  } catch {
    return false;
  }
}
