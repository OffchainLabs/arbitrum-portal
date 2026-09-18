import { EVM, config as lifiConfig } from '@lifi/sdk';
import { createConfig, http } from '@wagmi/core';
import { mainnet } from 'viem/chains';
import { expect, it, vi } from 'vitest';

import { initializeLifiRuntime } from './lifiRuntime';

vi.mock('@lifi/sdk', () => ({
  EVM: vi.fn((options) => options),
  config: { setProviders: vi.fn() },
}));
it('registers enabled providers once for the wallet runtime', () => {
  const config = createConfig({ chains: [mainnet], transports: { [mainnet.id]: http() } });
  initializeLifiRuntime(config);
  initializeLifiRuntime(config);
  expect(EVM).toHaveBeenCalledTimes(1);
  expect(lifiConfig.setProviders).toHaveBeenCalledTimes(1);
  expect(lifiConfig.setProviders).toHaveBeenCalledWith([
    expect.objectContaining({
      getWalletClient: expect.any(Function),
      switchChain: expect.any(Function),
    }),
  ]);
});
