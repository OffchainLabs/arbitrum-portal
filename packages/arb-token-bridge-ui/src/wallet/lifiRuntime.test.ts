import { EVM, config as lifiConfig } from '@lifi/sdk';
import { createConfig, http } from '@wagmi/core';
import { mainnet } from 'viem/chains';
import { expect, it, vi } from 'vitest';

import { initializeEvmLifiRuntime } from './lifiRuntime';

vi.mock('@lifi/sdk', () => ({
  EVM: vi.fn((options) => options),
  config: { setProviders: vi.fn() },
}));
it('registers the EVM provider once for the wallet runtime', () => {
  const config = createConfig({ chains: [mainnet], transports: { [mainnet.id]: http() } });
  initializeEvmLifiRuntime(config);
  initializeEvmLifiRuntime(config);
  expect(EVM).toHaveBeenCalledTimes(1);
  expect(lifiConfig.setProviders).toHaveBeenCalledTimes(1);
  expect(lifiConfig.setProviders).toHaveBeenCalledWith([
    expect.objectContaining({
      getWalletClient: expect.any(Function),
      switchChain: expect.any(Function),
    }),
  ]);
});
