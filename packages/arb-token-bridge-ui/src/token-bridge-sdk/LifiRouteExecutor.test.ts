import {
  EVM,
  type RouteExtended,
  Solana,
  executeRoute,
  config as lifiConfig,
  resumeRoute,
} from '@lifi/sdk';
import type { WalletClient } from 'viem';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createMockLifiRoute } from '../test-utils/lifi';
import { createMockSigners } from '../test-utils/signers';
import { ecosystems } from '../wallet/ecosystems';
import { executeLifiRoute, resumeLifiRoute } from './LifiRouteExecutor';

vi.mock('@lifi/sdk', async (original) => {
  const actual = await original<typeof import('@lifi/sdk')>();
  return {
    ...actual,
    config: { setProviders: vi.fn() },
    EVM: vi.fn(actual.EVM),
    Solana: vi.fn(actual.Solana),
    executeRoute: vi.fn(),
    resumeRoute: vi.fn(),
  };
});

const runProps = { signers: createMockSigners(), switchChainAsync: vi.fn() };
const txHash = '0xa0231341aef0576cd9467d1506011d1dd041167762db0d2b1657678e3c0c5255';
const route = {
  ...createMockLifiRoute(),
  steps: [{ execution: { process: [{ type: 'CROSS_CHAIN', status: 'PENDING', txHash }] } }],
} as unknown as RouteExtended;

beforeEach(() => {
  vi.clearAllMocks();
});

describe.sequential('LiFi providers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    ['execute', 'true', ['EVM', 'SVM']],
    ['resume', 'true', ['EVM', 'SVM']],
    ['execute', 'false', ['EVM']],
    ['resume', 'false', ['EVM']],
  ])(
    'registers providers to %s a route when the Solana flag is %s',
    async (action, flag, types) => {
      vi.spyOn(ecosystems.solana, 'isEnabled').mockReturnValue(flag === 'true');
      vi.mocked(executeRoute).mockResolvedValue(route);
      vi.mocked(resumeRoute).mockResolvedValue(route);

      await (action === 'execute'
        ? executeLifiRoute(route, { ...runProps, onRouteExecutionError: vi.fn() })
        : resumeLifiRoute(route, runProps));

      const providers = vi.mocked(lifiConfig.setProviders).mock.calls[0]?.[0];
      expect(providers?.map((provider) => provider.type)).toEqual(types);
    },
  );

  it('signs through the signers it was given', async () => {
    vi.spyOn(ecosystems.solana, 'isEnabled').mockReturnValue(true);
    vi.mocked(resumeRoute).mockResolvedValue(route);
    const signers = createMockSigners();
    const walletClient = {} as WalletClient;
    vi.mocked(signers.evm.getWalletClient).mockResolvedValue(walletClient);
    const switchChainAsync = vi.fn();

    await resumeLifiRoute(route, { signers, switchChainAsync });

    expect(Solana).toHaveBeenCalledWith({ getWalletAdapter: signers.solana.getWalletAdapter });
    const evmOptions = vi.mocked(EVM).mock.calls[0]?.[0];
    await expect(evmOptions?.getWalletClient?.()).resolves.toBe(walletClient);
    await expect(evmOptions?.switchChain?.(10)).resolves.toBe(walletClient);
    expect(switchChainAsync).toHaveBeenCalledWith({ chainId: 10 });
    expect(signers.evm.getWalletClient).toHaveBeenLastCalledWith(10);
  });

  it('registers providers only for the signers it was given', async () => {
    vi.spyOn(ecosystems.solana, 'isEnabled').mockReturnValue(true);
    vi.mocked(resumeRoute).mockResolvedValue(route);

    await resumeLifiRoute(route, {
      signers: { evm: createMockSigners().evm },
      switchChainAsync: vi.fn(),
    });

    const providers = vi.mocked(lifiConfig.setProviders).mock.calls[0]?.[0];
    expect(providers?.map((provider) => provider.type)).toEqual(['EVM']);
  });
});
