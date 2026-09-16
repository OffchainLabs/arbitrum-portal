import { getProviderForChainId } from '../token-bridge-sdk/utils';
import { getWalletEcosystem } from '../wallet/getWalletEcosystem';
import type { WalletEcosystem } from '../wallet/types';
import { type Address, isValidAddressForChain } from './AddressUtils';

export type AccountType =
  | 'externally-owned-account'
  | 'delegated-account'
  | 'smart-contract-wallet';

type AccountTypeParams = { address: Address; chainId: number };
const accountTypeProbes: Record<
  WalletEcosystem,
  (params: AccountTypeParams) => Promise<AccountType | undefined>
> = {
  evm: getEvmAccountType,
  solana: async () => undefined,
};

export async function getAccountType(params: AccountTypeParams): Promise<AccountType | undefined> {
  return accountTypeProbes[getWalletEcosystem(params.chainId)](params);
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
