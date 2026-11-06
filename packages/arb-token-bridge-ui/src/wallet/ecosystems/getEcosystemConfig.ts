import { type EcosystemConfig, ecosystems } from '.';
import { getWalletEcosystem } from '../getWalletEcosystem';

// Lives outside `index.ts` so `AddressEquality` can import the configs without network modules
export function getEcosystemConfig(chainId: number): EcosystemConfig {
  return ecosystems[getWalletEcosystem(chainId)];
}

export function getNativeTokenAddress(chainId: number): string {
  return getEcosystemConfig(chainId).nativeTokenAddress;
}
