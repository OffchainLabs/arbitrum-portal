import type { Provider } from '@ethersproject/providers';

import { getWalletEcosystem } from './getWalletEcosystem';

export function getEvmProvider(chainId: number, provider: Provider): Provider | undefined {
  return getWalletEcosystem(chainId) === 'evm' ? provider : undefined;
}
