import {
  EVM,
  type RouteExtended,
  Solana,
  executeRoute,
  getActiveRoute,
  config as lifiConfig,
  resumeRoute,
} from '@lifi/sdk';
import type { WalletClient } from 'viem';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createMockLifiRoute } from '../test-utils/lifi';
import { createMockSigners } from '../test-utils/signers';
import { ChainId } from '../types/ChainId';
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
    getActiveRoute: vi.fn(),
  };
});

const runProps = { signers: createMockSigners(), switchChainAsync: vi.fn() };
const txHash = '0xa0231341aef0576cd9467d1506011d1dd041167762db0d2b1657678e3c0c5255';
const route = {
  ...createMockLifiRoute(),
  steps: [{ execution: { process: [{ type: 'CROSS_CHAIN', status: 'PENDING', txHash }] } }],
} as unknown as RouteExtended;

const evmAddress = '0x0000000000000000000000000000000000000001';
const otherEvmAddress = '0x0000000000000000000000000000000000000002';
const solanaAddress = 'So11111111111111111111111111111111111111112';
const otherSolanaAddress = 'Hgw1pNJDYm5NbMheUHFNniiqtncor73swrH4RSN9APu5';

// A Solana step followed by an EVM step, the first one optionally finished
function crossEcosystemRoute(firstStepDone: boolean) {
  return {
    ...createMockLifiRoute(),
    steps: [
      {
        action: { fromChainId: ChainId.Solana, fromAddress: solanaAddress },
        execution: firstStepDone ? { status: 'DONE', process: [] } : undefined,
      },
      { action: { fromChainId: ChainId.ArbitrumOne, fromAddress: evmAddress } },
    ],
  } as unknown as RouteExtended;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getActiveRoute).mockReturnValue(undefined);
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
        ? executeLifiRoute(createMockLifiRoute(), { ...runProps, onRouteExecutionError: vi.fn() })
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

describe.sequential('LiFi execution guards', () => {
  it('refuses to execute a route that already started', async () => {
    vi.mocked(getActiveRoute).mockReturnValueOnce(route);
    const props = { ...runProps, onRouteExecutionError: vi.fn() };

    await expect(executeLifiRoute(createMockLifiRoute(), props)).rejects.toThrow(/already started/);
    await expect(executeLifiRoute(route, props)).rejects.toThrow(/already started/);
    expect(executeRoute).not.toHaveBeenCalled();
  });

  it('rechecks the EVM account after the approval dialog', async () => {
    const quote = {
      ...createMockLifiRoute(),
      steps: [{ action: { fromChainId: ChainId.Ethereum, fromAddress: evmAddress } }],
    } as unknown as RouteExtended;
    let connectedAddress = evmAddress;
    const signers = createMockSigners();
    signers.evm.getAddress = () => connectedAddress;
    vi.mocked(executeRoute).mockImplementationOnce(async (_route, options) => {
      await options?.updateTransactionRequestHook?.({ requestType: 'approve' });
      return route;
    });
    const onApprovalRequest = vi.fn(async () => {
      connectedAddress = otherEvmAddress;
      return true;
    });

    await expect(
      executeLifiRoute(quote, {
        ...runProps,
        signers,
        onApprovalRequest,
        onRouteExecutionError: vi.fn(),
      }),
    ).rejects.toThrow(/signing account changed/);
  });

  it.each([
    ['the Solana step', false, { evm: otherEvmAddress, solana: solanaAddress }, true],
    ['the Solana step', false, { evm: evmAddress, solana: otherSolanaAddress }, false],
    ['the EVM step', true, { evm: evmAddress, solana: otherSolanaAddress }, true],
    ['the EVM step', true, { evm: otherEvmAddress, solana: solanaAddress }, false],
  ])(
    'checks %s against the wallet of its ecosystem (first step done: %s)',
    async (_step, firstStepDone, wallets, allowed) => {
      const solanaEnabled = vi.spyOn(ecosystems.solana, 'isEnabled').mockReturnValue(true);
      try {
        const resumed = crossEcosystemRoute(firstStepDone);
        vi.mocked(resumeRoute).mockImplementationOnce(async (_route, options) => {
          await options?.updateTransactionRequestHook?.({ requestType: 'transaction' });
          return resumed;
        });

        const resume = resumeLifiRoute(resumed, {
          ...runProps,
          signers: createMockSigners(wallets),
        });

        await (allowed
          ? expect(resume).resolves.toBe(resumed)
          : expect(resume).rejects.toThrow(/signing account changed/));
      } finally {
        solanaEnabled.mockRestore();
      }
    },
  );

  it('stops when the wallet of the step is not among the signers', async () => {
    const solanaEnabled = vi.spyOn(ecosystems.solana, 'isEnabled').mockReturnValue(true);
    try {
      const resumed = crossEcosystemRoute(false);
      vi.mocked(resumeRoute).mockImplementationOnce(async (_route, options) => {
        await options?.updateTransactionRequestHook?.({ requestType: 'transaction' });
        return resumed;
      });

      await expect(
        resumeLifiRoute(resumed, {
          ...runProps,
          signers: { evm: createMockSigners({ evm: evmAddress }).evm },
        }),
      ).rejects.toThrow(/signing account changed/);
    } finally {
      solanaEnabled.mockRestore();
    }
  });
});
