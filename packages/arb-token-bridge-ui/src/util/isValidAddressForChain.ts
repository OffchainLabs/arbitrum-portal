import { getWalletEcosystem } from '../wallet/getWalletEcosystem';
import { ecosystemAddressValidators } from './AddressUtils';

export function isValidAddressForChain(address: string | undefined, chainId: number): boolean {
  if (!address) return false;
  try {
    return ecosystemAddressValidators[getWalletEcosystem(chainId)](address);
  } catch {
    return false;
  }
}
