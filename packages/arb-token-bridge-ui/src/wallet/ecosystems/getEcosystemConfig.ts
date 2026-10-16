import { type EcosystemConfig, ecosystems } from '.';
import { getWalletEcosystem } from '../getWalletEcosystem';

// Lives outside `index.ts` so `AddressEquality` can import the configs without network modules
export function getEcosystemConfig(chainId: number): EcosystemConfig {
  return ecosystems[getWalletEcosystem(chainId)];
}

/** Like `getEcosystemConfig`, for chains the bridge may not know, such as those of old history rows */
export function findEcosystemConfig(chainId: number): EcosystemConfig | undefined {
  try {
    return getEcosystemConfig(chainId);
  } catch {
    return undefined;
  }
}

export function getNativeTokenAddress(chainId: number): string {
  return getEcosystemConfig(chainId).nativeTokenAddress;
}
