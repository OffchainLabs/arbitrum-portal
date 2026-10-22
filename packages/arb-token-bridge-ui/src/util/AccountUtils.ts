import { getProviderForChainId } from '../token-bridge-sdk/utils';
import type { WalletEcosystem } from '../wallet/types';
import { findAddressEcosystem, isValidAddressForChain } from './AddressUtils';

export type AccountType =
  'externally-owned-account' | 'delegated-account' | 'smart-contract-wallet';

type AccountTypeParams = { address: string; chainId: number };
const accountTypeProbes: Record<
  WalletEcosystem,
  (params: AccountTypeParams) => Promise<AccountType | undefined>
> = {
  evm: getEvmAccountType,
  solana: async ({ address, chainId }) =>
    isValidAddressForChain(address, chainId) ? 'externally-owned-account' : undefined,
};

export async function getAccountType(params: AccountTypeParams): Promise<AccountType | undefined> {
  const ecosystem = findAddressEcosystem(params.address);
  return ecosystem ? accountTypeProbes[ecosystem](params) : undefined;
}

async function getEvmAccountType({
  address,
  chainId,
}: AccountTypeParams): Promise<AccountType | undefined> {
  if (!isValidAddressForChain(address, chainId)) {
    return undefined;
  }
  const provider = getProviderForChainId(chainId);
  try {
    const code = await provider.getCode(address);
    // delegation designator prefix for 7702
    if (code.startsWith('0xef01')) {
      return 'delegated-account';
    }
    if (code.length > 2) {
      return 'smart-contract-wallet';
    }
    return 'externally-owned-account';
  } catch (_) {
    return undefined;
  }
}
