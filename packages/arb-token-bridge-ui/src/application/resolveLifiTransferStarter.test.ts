import { StaticJsonRpcProvider } from '@ethersproject/providers';
import { BigNumber } from 'ethers';
import { arbitrum, mainnet } from 'viem/chains';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { LifiCrosschainTransfersRoute } from '../app/api/crosschain-transfers/lifi';
import { createMockLifiRoute } from '../test-utils/lifi';
import * as lifiExecutor from '../token-bridge-sdk/LifiRouteExecutor';
import { LifiTransferStarter } from '../token-bridge-sdk/LifiTransferStarter';
import { SolanaTransferStarter } from '../token-bridge-sdk/SolanaTransferStarter';
import { ChainId } from '../types/ChainId';
import { getNativeTokenAddress } from '../wallet/constants';
import type { EvmWalletHandle, SolanaWalletHandle } from '../wallet/types';
import { resolveLifiTransferStarter as resolveStarter } from './resolveLifiTransferStarter';

function resolveLifiTransferStarter(
  input: Omit<
    Parameters<typeof resolveStarter>[0],
    'sourceChainId' | 'destinationChainId' | 'sourceTokenAddress' | 'destinationTokenAddress'
  >,
) {
  return resolveStarter({
    sourceChainId: input.route.fromChainId,
    destinationChainId: input.route.toChainId,
    sourceTokenAddress: getNativeTokenAddress(input.route.fromChainId),
    destinationTokenAddress: getNativeTokenAddress(input.route.toChainId),
    ...input,
  });
}

vi.hoisted(() => vi.stubEnv('NEXT_PUBLIC_FEATURE_FLAG_SOLANA_ENABLED', 'true'));

const runtime = vi.hoisted(() => ({
  get: vi.fn(async () => ({
    sourceChainProvider: { getNetwork: vi.fn(async () => mainnet) },
    destinationChainProvider: { getNetwork: vi.fn(async () => arbitrum) },
    wagmiConfig: {},
    assertSigningAccount: vi.fn(async () => {}),
  })),
}));

vi.mock('./evmExecutionRuntime', () => ({ getEvmExecutionRuntime: runtime.get }));
const solanaAddress = 'So11111111111111111111111111111111111111112';
const evmAddress = '0x1111111111111111111111111111111111111111';
const transferInputs = {
  amountBigNumber: BigNumber.from(1),
  destinationAddress: evmAddress,
  confirmDialog: vi.fn(async () => true),
};
const callbacks = {
  onRouteUpdate: vi.fn(),
  onRouteExecutionComplete: vi.fn(),
  onRouteExecutionError: vi.fn(),
};

function route(fromChainId: number, toChainId: number): LifiCrosschainTransfersRoute {
  const sender = fromChainId === ChainId.Solana ? solanaAddress : evmAddress;
  const protocolRoute = createMockLifiRoute({
    fromAddress: sender,
    toAddress: evmAddress,
    fromChainId,
    toChainId,
    fromAmount: '1',
    toAmount: '1',
    fromToken: {
      address: getNativeTokenAddress(fromChainId),
      chainId: fromChainId,
      symbol: 'SOURCE',
      name: 'Source',
      decimals: 18,
      priceUSD: '1',
    },
    toToken: {
      address: getNativeTokenAddress(toChainId),
      chainId: toChainId,
      symbol: 'DEST',
      name: 'Destination',
      decimals: 18,
      priceUSD: '1',
    },
  });
  return {
    type: 'lifi',
    durationMs: 1,
    gas: [],
    fee: [],
    fromAmount: {
      amount: '1',
      amountUSD: '1',
      token: protocolRoute.fromToken,
    },
    toAmount: {
      amount: '1',
      amountUSD: '1',
      token: protocolRoute.toToken,
    },
    fromChainId,
    toChainId,
    fromAddress: sender,
    toAddress: evmAddress,
    protocolData: {
      route: {
        ...protocolRoute,
        steps: [
          {
            id: 'step',
            type: 'lifi',
            tool: 'mayan',
            toolDetails: { key: 'mayan', name: 'Mayan', logoURI: '' },
            includedSteps: [],
            action: {
              fromChainId,
              toChainId,
              fromAddress: sender,
              toAddress: evmAddress,
              fromAmount: '1',
              fromToken: protocolRoute.fromToken,
              toToken: protocolRoute.toToken,
            },
            estimate: {
              tool: 'mayan',
              fromAmount: '1',
              toAmount: '1',
              toAmountMin: '1',
              approvalAddress: evmAddress,
              executionDuration: 1,
            },
          },
        ],
      },
    },
  };
}

const solanaWallet: SolanaWalletHandle = {
  ecosystem: 'solana',
  account: {
    ecosystem: 'solana',
    address: solanaAddress,
    chainId: ChainId.Solana,
    status: 'connected',
  },
  isConnected: true,
  disconnect: vi.fn(async () => {}),
  sendTransaction: vi.fn(async () => 'signature'),
  confirmTransaction: vi.fn(async () => {}),
};

const evmWallet: EvmWalletHandle = {
  ecosystem: 'evm',
  account: {
    ecosystem: 'evm',
    address: evmAddress,
    chainId: ChainId.Ethereum,
    status: 'connected',
  },
  isConnected: true,
  disconnect: vi.fn(async () => {}),
};

describe.sequential('resolveLifiTransferStarter', () => {
  beforeEach(() => runtime.get.mockClear());
  afterEach(() => vi.restoreAllMocks());

  it('resolves the existing EVM starter and runtime', async () => {
    const resolution = await resolveLifiTransferStarter({
      ...transferInputs,
      route: route(ChainId.Ethereum, ChainId.ArbitrumOne),
      wallet: evmWallet,
    });

    expect(resolution.transfer).toBeTypeOf('function');
    expect(runtime.get).toHaveBeenCalledExactlyOnceWith({
      sourceChainId: ChainId.Ethereum,
      destinationChainId: ChainId.ArbitrumOne,
      expectedAccount: evmAddress,
    });
  });

  it('binds the EVM execution sender when the SDK omits its optional route sender', async () => {
    const quote = route(ChainId.Ethereum, ChainId.ArbitrumOne);
    quote.protocolData.route.fromAddress = undefined;
    const sourceChainProvider = {
      getNetwork: vi.fn(async () => mainnet),
      getTransaction: vi.fn(async () => null),
    };
    runtime.get.mockResolvedValueOnce({
      sourceChainProvider,
      destinationChainProvider: { getNetwork: vi.fn(async () => arbitrum) },
      wagmiConfig: {},
      assertSigningAccount: vi.fn(async () => {}),
    });
    const execute = vi.spyOn(lifiExecutor, 'executeLifiRoute').mockResolvedValue({
      txHash: 'hash',
      route: quote.protocolData.route,
    });
    const resolution = await resolveLifiTransferStarter({
      ...transferInputs,
      route: quote,
      wallet: evmWallet,
    });
    await resolution.transfer(callbacks);
    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({ fromAddress: evmAddress }),
      expect.any(Object),
    );
    expect(quote.protocolData.route.fromAddress).toBeUndefined();
  });

  it.each(['sender', 'recipient', 'both'])(
    'accepts a bound Solana quote when the SDK omits optional raw %s fields',
    async (missing) => {
      const quote = route(ChainId.Solana, ChainId.ArbitrumOne);
      if (missing === 'sender' || missing === 'both')
        quote.protocolData.route.fromAddress = undefined;
      if (missing === 'recipient' || missing === 'both')
        quote.protocolData.route.toAddress = undefined;
      const resolution = await resolveLifiTransferStarter({
        ...transferInputs,
        route: quote,
        wallet: solanaWallet,
      });
      expect(resolution.transfer).toBeTypeOf('function');
      expect(runtime.get).not.toHaveBeenCalled();
    },
  );

  it.each([true, false])(
    'binds EVM approval and receipt handling, receipt=%s',
    async (hasReceipt) => {
      const provider = new StaticJsonRpcProvider();
      const wait = vi.fn(async () => provider.getTransactionReceipt('unused'));
      const transaction = hasReceipt
        ? {
            hash: 'hash',
            confirmations: 0,
            from: evmAddress,
            nonce: 0,
            gasLimit: BigNumber.from(0),
            value: BigNumber.from(0),
            data: '0x',
            chainId: 1,
            wait,
          }
        : { hash: 'hash' };
      const transfer = vi.spyOn(LifiTransferStarter.prototype, 'transfer').mockResolvedValue({
        transferType: 'lifi',
        status: 'pending',
        sourceChainTransaction: transaction,
        sourceChainProvider: provider,
        destinationChainProvider: provider,
        lifiRoute: createMockLifiRoute(),
      });
      const resolution = await resolveLifiTransferStarter({
        ...transferInputs,
        route: route(ChainId.Ethereum, ChainId.ArbitrumOne),
        wallet: evmWallet,
      });
      const submitted = await resolution.transfer(callbacks);
      const args = transfer.mock.calls[0]?.[0];
      expect(args).toMatchObject({
        amount: transferInputs.amountBigNumber,
        destinationAddress: evmAddress,
        wagmiConfig: {},
        ...callbacks,
      });
      const approvalRequest = { to: evmAddress, data: '0x' };
      await args?.onApprovalRequest?.(approvalRequest);
      expect(transferInputs.confirmDialog).toHaveBeenLastCalledWith('approve_lifi_token', {
        lifiApproval: { approvalRequest },
      });
      expect(wait).not.toHaveBeenCalled();
      if (hasReceipt) {
        const failure = new Error('receipt failure');
        wait.mockRejectedValueOnce(failure);
        await expect(submitted.waitForSourceConfirmation?.()).rejects.toThrow(failure);
        expect(wait).toHaveBeenCalledOnce();
      } else {
        expect(submitted.waitForSourceConfirmation).toBeUndefined();
      }
    },
  );

  it.each([ChainId.ArbitrumOne, ChainId.ApeChain, ChainId.Superposition])(
    'resolves Solana to %s without loading the EVM runtime',
    async (destinationChainId) => {
      const resolution = await resolveLifiTransferStarter({
        ...transferInputs,
        route: route(ChainId.Solana, destinationChainId),
        wallet: solanaWallet,
      });

      const transfer = vi.spyOn(SolanaTransferStarter.prototype, 'transfer').mockResolvedValue({
        transferType: 'lifi',
        status: 'pending',
        sourceChainTransaction: { hash: 'signature' },
        lifiRoute: createMockLifiRoute(),
      });
      expect(await resolution.transfer(callbacks)).toEqual({});
      expect(transfer).toHaveBeenCalledExactlyOnceWith(callbacks);
      expect(runtime.get).not.toHaveBeenCalled();
    },
  );

  it.each([
    [ChainId.Solana, ChainId.Base, solanaWallet],
    [ChainId.Ethereum, ChainId.Solana, evmWallet],
    [ChainId.ArbitrumOne, ChainId.Solana, evmWallet],
  ])('rejects unsupported pair %s to %s before creating a runtime', async (from, to, wallet) => {
    await expect(
      resolveLifiTransferStarter({ ...transferInputs, route: route(from, to), wallet }),
    ).rejects.toThrow(/chain pair/i);
    expect(runtime.get).not.toHaveBeenCalled();
  });

  it.each([
    'unbound',
    'protocol sender',
    'step sender',
    'unbound step sender',
    'recipient',
    'protocol recipient',
    'amount',
  ])('rejects a mismatched Solana quote: %s', async (change) => {
    const quote = route(ChainId.Solana, ChainId.ArbitrumOne);
    const step = quote.protocolData.route.steps[0];
    if (!step) throw new Error('Fixture requires a step');
    switch (change) {
      case 'unbound':
        quote.fromAddress = undefined;
        break;
      case 'protocol sender':
        quote.protocolData.route.fromAddress = evmAddress;
        break;
      case 'step sender':
        step.action.fromAddress = evmAddress;
        break;
      case 'unbound step sender':
        step.action.fromAddress = undefined;
        quote.protocolData.route.fromAddress = undefined;
        break;
      case 'protocol recipient':
        quote.protocolData.route.toAddress = '0x2222222222222222222222222222222222222222';
        break;
      case 'recipient':
        step.action.toAddress = '0x2222222222222222222222222222222222222222';
        break;
      case 'amount':
        step.action.fromAmount = '2';
        break;
    }
    await expect(
      resolveLifiTransferStarter({
        ...transferInputs,
        route: quote,
        wallet: solanaWallet,
      }),
    ).rejects.toThrow(/quote|does not match/i);
    expect(runtime.get).not.toHaveBeenCalled();
  });

  it('rejects a route requested by a different Solana account', async () => {
    await expect(
      resolveLifiTransferStarter({
        ...transferInputs,
        route: {
          ...route(ChainId.Solana, ChainId.ArbitrumOne),
          fromAddress: 'Hgw1pNJDYm5NbMheUHFNniiqtncor73swrH4RSN9APu5',
        },
        wallet: solanaWallet,
      }),
    ).rejects.toThrow(/does not match/i);
    expect(runtime.get).not.toHaveBeenCalled();
  });
});
