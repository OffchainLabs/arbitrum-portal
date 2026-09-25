import { getExplorerUrl } from '../util/networks';
import { getWalletEcosystem } from '../wallet/getWalletEcosystem';
import type { WalletEcosystem } from '../wallet/types';

const accountPathSegments: Record<WalletEcosystem, string> = {
  evm: 'address',
  solana: 'account',
};

export function getAccountExplorerUrl(chainId: number, address: string): string {
  return `${getExplorerUrl(chainId)}/${accountPathSegments[getWalletEcosystem(chainId)]}/${address}`;
}
