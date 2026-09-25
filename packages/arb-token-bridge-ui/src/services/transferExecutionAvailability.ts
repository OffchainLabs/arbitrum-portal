import { getWalletEcosystem } from '../wallet/getWalletEcosystem';
import type { WalletEcosystem, WalletHandle } from '../wallet/types';

const executableEcosystems: Partial<Record<WalletEcosystem, boolean>> = { evm: true };
export function isTransferExecutionSupported(chainId: number): boolean {
  try {
    return executableEcosystems[getWalletEcosystem(chainId)] === true;
  } catch {
    return false;
  }
}

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
    return wallet.ecosystem === ecosystem && isTransferExecutionSupported(chainId);
  } catch {
    return false;
  }
}
