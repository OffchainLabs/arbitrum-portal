import type { RouteExtended } from '@lifi/sdk';
import { BigNumber } from 'ethers';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { LifiCrosschainTransfersRoute } from '../app/api/crosschain-transfers/lifi';
import { createMockLifiRoute } from '../test-utils/lifi';
import * as lifiExecutor from '../token-bridge-sdk/LifiRouteExecutor';
import { resolveLifiTransferStarter } from './resolveLifiTransferStarter';

const runtime = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('./evmExecutionRuntime', () => ({ getEvmExecutionRuntime: runtime.get }));
const sender = '0x1111111111111111111111111111111111111111';
const recipient = '0x2222222222222222222222222222222222222222';
const otherAddress = '0x3333333333333333333333333333333333333333';
const sourceTokenAddress = '0x4444444444444444444444444444444444444444';
const destinationTokenAddress = '0x5555555555555555555555555555555555555555';
const sourceChainId = 1;
const destinationChainId = 42161;
const selected = {
  sourceChainId,
  destinationChainId,
  sourceTokenAddress,
  destinationTokenAddress,
  destinationAddress: recipient,
  amountBigNumber: BigNumber.from(100),
  confirmDialog: vi.fn(async () => true),
  wallet: {
    ecosystem: 'evm' as const,
    isConnected: true,
    account: { address: sender, chainId: sourceChainId },
  },
};
function quote(): LifiCrosschainTransfersRoute {
  const fromToken = {
    address: sourceTokenAddress,
    chainId: sourceChainId,
    decimals: 6,
    name: 'Input',
    symbol: 'IN',
    priceUSD: '1',
  };
  const toToken = {
    ...fromToken,
    address: destinationTokenAddress,
    chainId: destinationChainId,
    name: 'Output',
    symbol: 'OUT',
  };
  const step: RouteExtended['steps'][number] = {
    id: 'bridge',
    type: 'lifi',
    tool: 'relay',
    toolDetails: { key: 'relay', name: 'Relay', logoURI: '' },
    includedSteps: [],
    action: {
      fromChainId: sourceChainId,
      toChainId: destinationChainId,
      fromToken,
      toToken,
      fromAddress: sender,
      toAddress: recipient,
      fromAmount: '100',
      slippage: 0.005,
    },
    estimate: {
      tool: 'relay',
      fromAmount: '100',
      toAmount: '99',
      toAmountMin: '98',
      approvalAddress: sourceTokenAddress,
      executionDuration: 1,
    },
  };
  const raw = createMockLifiRoute({ steps: [step], fromAddress: sender, toAddress: recipient });
  return {
    type: 'lifi',
    durationMs: 1000,
    gas: [],
    fee: [],
    fromChainId: sourceChainId,
    toChainId: destinationChainId,
    fromAddress: sender,
    toAddress: recipient,
    fromAmount: { amount: '100', amountUSD: '1', token: { ...fromToken } },
    toAmount: { amount: '99', amountUSD: '1', token: { ...toToken } },
    protocolData: { route: raw },
  };
}
const changedQuotes: [string, (route: LifiCrosschainTransfersRoute) => void][] = [
  [
    'portal sender missing',
    (r) => {
      r.fromAddress = undefined;
    },
  ],
  [
    'step sender missing',
    (r) => {
      r.protocolData.route.steps[0]!.action.fromAddress = undefined;
    },
  ],
  [
    'step sender changed',
    (r) => {
      r.protocolData.route.steps[0]!.action.fromAddress = otherAddress;
    },
  ],
  [
    'portal recipient missing',
    (r) => {
      r.toAddress = undefined;
    },
  ],
  [
    'portal recipient changed',
    (r) => {
      r.toAddress = otherAddress;
    },
  ],
  [
    'raw recipient changed',
    (r) => {
      r.protocolData.route.toAddress = otherAddress;
    },
  ],
  [
    'final recipient missing',
    (r) => {
      r.protocolData.route.steps.at(-1)!.action.toAddress = undefined;
    },
  ],
  [
    'final recipient changed',
    (r) => {
      r.protocolData.route.steps.at(-1)!.action.toAddress = otherAddress;
    },
  ],
  [
    'portal input changed',
    (r) => {
      r.fromAmount.amount = '101';
    },
  ],
  [
    'raw input changed',
    (r) => {
      r.protocolData.route.fromAmount = '101';
    },
  ],
  [
    'first step input changed',
    (r) => {
      r.protocolData.route.steps[0]!.action.fromAmount = '101';
    },
  ],
  [
    'displayed output changed',
    (r) => {
      r.toAmount.amount = '101';
    },
  ],
  [
    'final step output changed',
    (r) => {
      r.protocolData.route.steps.at(-1)!.estimate.toAmount = '101';
    },
  ],
  [
    'portal source chain changed',
    (r) => {
      r.fromChainId = 10;
    },
  ],
  [
    'portal destination chain changed',
    (r) => {
      r.toChainId = 10;
    },
  ],
  [
    'raw source chain changed',
    (r) => {
      r.protocolData.route.fromChainId = 10;
    },
  ],
  [
    'raw destination chain changed',
    (r) => {
      r.protocolData.route.toChainId = 10;
    },
  ],
  [
    'first step source chain changed',
    (r) => {
      r.protocolData.route.steps[0]!.action.fromChainId = 10;
    },
  ],
  [
    'final step destination chain changed',
    (r) => {
      r.protocolData.route.steps.at(-1)!.action.toChainId = 10;
    },
  ],
  [
    'portal source token changed',
    (r) => {
      r.fromAmount.token.address = otherAddress;
    },
  ],
  [
    'portal destination token changed',
    (r) => {
      r.toAmount.token.address = otherAddress;
    },
  ],
  [
    'raw source token changed',
    (r) => {
      r.protocolData.route.fromToken = { ...r.protocolData.route.fromToken, address: otherAddress };
    },
  ],
  [
    'raw destination token changed',
    (r) => {
      r.protocolData.route.toToken = { ...r.protocolData.route.toToken, address: otherAddress };
    },
  ],
  [
    'raw source token chain changed',
    (r) => {
      r.protocolData.route.fromToken = { ...r.protocolData.route.fromToken, chainId: 10 };
    },
  ],
  [
    'raw destination token chain changed',
    (r) => {
      r.protocolData.route.toToken = { ...r.protocolData.route.toToken, chainId: 10 };
    },
  ],
  [
    'first step source token changed',
    (r) => {
      const a = r.protocolData.route.steps[0]!.action;
      a.fromToken = { ...a.fromToken, address: otherAddress };
    },
  ],
  [
    'final step destination token changed',
    (r) => {
      const a = r.protocolData.route.steps.at(-1)!.action;
      a.toToken = { ...a.toToken, address: otherAddress };
    },
  ],
  [
    'first step source token chain changed',
    (r) => {
      const a = r.protocolData.route.steps[0]!.action;
      a.fromToken = { ...a.fromToken, chainId: 10 };
    },
  ],
  [
    'final step destination token chain changed',
    (r) => {
      const a = r.protocolData.route.steps.at(-1)!.action;
      a.toToken = { ...a.toToken, chainId: 10 };
    },
  ],
];

describe.sequential('EVM LiFi submitted transfer binding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runtime.get.mockResolvedValue({
      sourceChainProvider: {
        getNetwork: vi.fn(async () => ({ chainId: sourceChainId })),
        getTransaction: vi.fn(async () => null),
      },
      destinationChainProvider: {
        getNetwork: vi.fn(async () => ({ chainId: destinationChainId })),
      },
      wagmiConfig: {},
    });
  });

  it.each(changedQuotes)('rejects %s before resolving a signer', async (_label, change) => {
    const route = quote();
    change(route);
    await expect(resolveLifiTransferStarter({ ...selected, route })).rejects.toThrow(
      /quote|does not match|chain pair/i,
    );
    expect(runtime.get).not.toHaveBeenCalled();
  });

  it('accepts source and destination swaps around a bridge through an intermediate chain', async () => {
    const route = quote();
    const original = route.protocolData.route.steps[0]!;
    const intermediateToken = { ...original.action.fromToken, address: otherAddress, chainId: 10 };
    const destinationBridgeToken = { ...intermediateToken, chainId: destinationChainId };
    route.protocolData.route.steps = [
      {
        ...original,
        id: 'first',
        action: {
          ...original.action,
          toChainId: 10,
          toToken: intermediateToken,
          toAddress: sender,
        },
      },
      {
        ...original,
        id: 'middle',
        action: {
          ...original.action,
          fromChainId: 10,
          fromToken: intermediateToken,
          fromAmount: '95',
          toToken: destinationBridgeToken,
          toAddress: sender,
        },
      },
      {
        ...original,
        id: 'last',
        action: {
          ...original.action,
          fromChainId: destinationChainId,
          fromToken: destinationBridgeToken,
          fromAmount: '90',
        },
      },
    ];
    const resolution = await resolveLifiTransferStarter({ ...selected, route });
    expect(resolution.transfer).toBeTypeOf('function');
    expect(runtime.get).toHaveBeenCalledOnce();
  });

  it.each([true, false])(
    'executes a self-recipient quote with no final step recipient, raw recipient omitted=%s',
    async (omitRawRecipient) => {
      const route = quote();
      route.toAddress = sender;
      route.protocolData.route.fromAddress = undefined;
      route.protocolData.route.toAddress = omitRawRecipient ? undefined : sender;
      route.protocolData.route.steps.at(-1)!.action.toAddress = undefined;
      const execute = vi.spyOn(lifiExecutor, 'executeLifiRoute').mockResolvedValue({
        txHash: 'hash',
        route: route.protocolData.route,
      });
      try {
        const resolution = await resolveLifiTransferStarter({
          ...selected,
          destinationAddress: sender,
          route,
        });
        await resolution.transfer({ onRouteExecutionError: vi.fn() });
        expect(execute).toHaveBeenCalledWith(
          expect.objectContaining({ fromAddress: sender, toAddress: sender }),
          expect.any(Object),
        );
        expect(execute.mock.calls[0]?.[0].steps.at(-1)?.action.toAddress).toBeUndefined();
        expect(route.protocolData.route.fromAddress).toBeUndefined();
        expect(route.protocolData.route.toAddress).toBe(omitRawRecipient ? undefined : sender);
      } finally {
        execute.mockRestore();
      }
    },
  );

  it('binds optional raw addresses from the validated submission without changing the quote', async () => {
    const route = quote();
    route.protocolData.route.fromAddress = undefined;
    route.protocolData.route.toAddress = undefined;
    const execute = vi
      .spyOn(lifiExecutor, 'executeLifiRoute')
      .mockResolvedValue({ txHash: 'hash', route: route.protocolData.route });
    try {
      const resolution = await resolveLifiTransferStarter({ ...selected, route });
      await resolution.transfer({ onRouteExecutionError: vi.fn() });
      expect(execute).toHaveBeenCalledWith(
        expect.objectContaining({ fromAddress: sender, toAddress: recipient }),
        expect.any(Object),
      );
      expect(route.protocolData.route.fromAddress).toBeUndefined();
      expect(route.protocolData.route.toAddress).toBeUndefined();
    } finally {
      execute.mockRestore();
    }
  });
});
