import { EVM, config as lifiConfig } from '@lifi/sdk';
import { Config, getWalletClient, switchChain } from '@wagmi/core';

let configured = false;

export function initializeLifiRuntime(wagmiConfig: Config) {
  if (configured) return;
  lifiConfig.setProviders([
    EVM({
      getWalletClient: () => getWalletClient(wagmiConfig),
      switchChain: async (chainId) => {
        await switchChain(wagmiConfig, { chainId });
        return getWalletClient(wagmiConfig, { chainId });
      },
    }),
  ]);
  configured = true;
}
