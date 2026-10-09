import type { LiFiStep } from '@lifi/sdk';
import { BigNumber } from 'ethers';
import { describe, expect, it, vi } from 'vitest';

import type { LifiCrosschainTransfersRoute } from '../app/api/crosschain-transfers/lifi';
import { createMockLifiRoute } from '../test-utils/lifi';
import { ChainId } from '../types/ChainId';
import type { SolanaWalletHandle } from '../wallet/types';
import { BridgeTransferStarterFactory } from './BridgeTransferStarterFactory';
import { SolanaTransferStarter } from './SolanaTransferStarter';
import * as providers from './utils';

const signature = '5'.repeat(88);
const serializedTransaction = Uint8Array.from([1, 2, 3]);

function route(steps: LiFiStep[] = [step()]): LifiCrosschainTransfersRoute {
  return {
    type: 'lifi',
    durationMs: 1,
    gas: [],
    fee: [],
    fromAmount: { amount: '1', amountUSD: '1', token: token(ChainId.Solana) },
    toAmount: { amount: '1', amountUSD: '1', token: token(ChainId.ArbitrumOne) },
    fromChainId: ChainId.Solana,
    toChainId: ChainId.ArbitrumOne,
    protocolData: { route: createMockLifiRoute({ steps }) },
  };
}

function token(chainId: number) {
  return {
    chainId,
    address: '11111111111111111111111111111111',
    symbol: 'SOL',
    name: 'Solana',
    decimals: 9,
    priceUSD: '1',
  };
}

function step(): LiFiStep {
  return {
    id: 'step',
    type: 'lifi',
    tool: 'mayan',
    toolDetails: { key: 'mayan', name: 'Mayan', logoURI: '' },
    action: {
      fromChainId: ChainId.Solana,
      toChainId: ChainId.ArbitrumOne,
      fromAmount: '1',
      fromToken: token(ChainId.Solana),
      toToken: token(ChainId.ArbitrumOne),
      fromAddress: 'So11111111111111111111111111111111111111112',
    },
    estimate: {
      tool: 'mayan',
      fromAmount: '1',
      toAmount: '1',
      toAmountMin: '1',
      approvalAddress: '11111111111111111111111111111111',
      executionDuration: 1,
    },
    includedSteps: [],
  };
}

function wallet(sendTransaction = vi.fn(async () => signature)): SolanaWalletHandle {
  return {
    ecosystem: 'solana',
    account: {
      ecosystem: 'solana',
      address: 'So11111111111111111111111111111111111111112',
      chainId: ChainId.Solana,
      status: 'connected',
    },
    isConnected: true,
    disconnect: vi.fn(async () => {}),
    sendTransaction,
  };
}

function callbacks() {
  return {
    onRouteUpdate: vi.fn(),
    onRouteExecutionError: vi.fn(),
    onRouteExecutionComplete: vi.fn(),
  };
}

describe('SolanaTransferStarter', () => {
  it('prepares, submits, and publishes the Solana signature before confirmation', async () => {
    const sendTransaction = vi.fn(async () => signature);
    const effects = callbacks();
    const starter = new SolanaTransferStarter({
      lifiRoute: route(),
      wallet: wallet(sendTransaction),
      prepareStep: vi.fn(async (value) => ({
        ...value,
        transactionRequest: { data: btoa(String.fromCharCode(...serializedTransaction)) },
      })),
      confirmTransaction: vi.fn(async () => {}),
    });

    const result = await starter.transfer(effects);

    expect(sendTransaction).toHaveBeenCalledExactlyOnceWith(serializedTransaction);
    expect(result.sourceChainTransaction.hash).toBe(signature);
    expect(effects.onRouteUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        steps: [
          expect.objectContaining({
            execution: expect.objectContaining({
              process: [expect.objectContaining({ txHash: signature, status: 'PENDING' })],
            }),
          }),
        ],
      }),
    );
    await vi.waitFor(() => expect(effects.onRouteExecutionComplete).toHaveBeenCalledOnce());
  });

  it.each([
    { slippage: 0.005, oldMinimum: '100000', newMinimum: '80000', rejected: true },
    { slippage: 0.005, oldMinimum: '100000', newMinimum: '99499', rejected: true },
    { slippage: 0.005, oldMinimum: '100000', newMinimum: '99500', rejected: false },
    { slippage: 0.005, oldMinimum: '100000', newMinimum: '99600', rejected: false },
    { slippage: 0.005, oldMinimum: '100000', newMinimum: '110000', rejected: false },
    { slippage: 0, oldMinimum: '100000', newMinimum: '99999', rejected: true },
    { slippage: 0, oldMinimum: '100000', newMinimum: '100000', rejected: false },
    { slippage: undefined, oldMinimum: '100000', newMinimum: '99499', rejected: true },
    { slippage: undefined, oldMinimum: '100000', newMinimum: '99500', rejected: false },
    { slippage: 0.005, oldMinimum: '199', newMinimum: '198', rejected: true },
    {
      slippage: 0.005,
      oldMinimum: '1000000000000000000000',
      newMinimum: '994999999999999999999',
      rejected: true,
    },
    {
      slippage: 0.005,
      oldMinimum: '1000000000000000000000',
      newMinimum: '995000000000000000000',
      rejected: false,
    },
  ])(
    'checks refreshed minimum $newMinimum against $oldMinimum with slippage $slippage',
    async ({ slippage, oldMinimum, newMinimum, rejected }) => {
      const quotedStep = step();
      quotedStep.action.slippage = slippage;
      quotedStep.estimate.toAmountMin = oldMinimum;
      const sendTransaction = vi.fn(async () => signature);
      const confirmTransaction = vi.fn(async () => {});
      const effects = callbacks();
      const starter = new SolanaTransferStarter({
        lifiRoute: route([quotedStep]),
        wallet: wallet(sendTransaction),
        prepareStep: vi.fn(async (value) => ({
          ...value,
          estimate: { ...value.estimate, toAmountMin: newMinimum },
          transactionRequest: { data: btoa(String.fromCharCode(...serializedTransaction)) },
        })),
        confirmTransaction,
      });

      if (rejected) {
        await expect(starter.transfer(effects)).rejects.toThrow(/slippage/i);
        expect(sendTransaction).not.toHaveBeenCalled();
        expect(confirmTransaction).not.toHaveBeenCalled();
        expect(effects.onRouteUpdate).not.toHaveBeenCalled();
      } else {
        await starter.transfer(effects);
        expect(sendTransaction).toHaveBeenCalledExactlyOnceWith(serializedTransaction);
      }
    },
  );

  it.each(['chain', 'token', 'amount', 'sender', 'recipient', 'slippage', 'tool'])(
    'rejects refreshed transfer detail changes before signing: %s',
    async (change) => {
      const quote = route();
      const sendTransaction = vi.fn(async () => signature);
      const starter = new SolanaTransferStarter({
        lifiRoute: quote,
        wallet: wallet(sendTransaction),
        confirmTransaction: vi.fn(async () => {}),
        prepareStep: vi.fn(async (value) => {
          switch (change) {
            case 'chain':
              value.action.toChainId = ChainId.Base;
              break;
            case 'token':
              value.action.fromToken.address = 'Hgw1pNJDYm5NbMheUHFNniiqtncor73swrH4RSN9APu5';
              break;
            case 'amount':
              value.action.fromAmount = '2';
              break;
            case 'sender':
              value.action.fromAddress = 'Hgw1pNJDYm5NbMheUHFNniiqtncor73swrH4RSN9APu5';
              break;
            case 'recipient':
              value.action.toAddress = '0x1111111111111111111111111111111111111111';
              break;
            case 'slippage':
              value.action.slippage = 0.5;
              break;
            case 'tool':
              value.tool = 'changed';
              break;
          }
          return {
            ...value,
            transactionRequest: { data: btoa(String.fromCharCode(...serializedTransaction)) },
          };
        }),
      });
      await expect(starter.transfer(callbacks())).rejects.toThrow(/transfer details/i);
      expect(sendTransaction).not.toHaveBeenCalled();
      expect(quote.protocolData.route.steps[0]).toEqual(step());
    },
  );

  it.each([undefined, '', 'not base64'])(
    'rejects an invalid payload before submission',
    async (data) => {
      const sendTransaction = vi.fn(async () => signature);
      const starter = new SolanaTransferStarter({
        lifiRoute: route(),
        wallet: wallet(sendTransaction),
        prepareStep: vi.fn(async (value) => ({
          ...value,
          transactionRequest: data === undefined ? undefined : { data },
        })),
        confirmTransaction: vi.fn(),
      });

      await expect(starter.transfer(callbacks())).rejects.toThrow(/transaction payload/i);
      expect(sendTransaction).not.toHaveBeenCalled();
    },
  );

  it('reports confirmation errors after preserving the submitted signature', async () => {
    const error = new Error('confirmation failed');
    const effects = callbacks();
    const starter = new SolanaTransferStarter({
      lifiRoute: route(),
      wallet: wallet(),
      prepareStep: vi.fn(async (value) => ({
        ...value,
        transactionRequest: { data: btoa(String.fromCharCode(...serializedTransaction)) },
      })),
      confirmTransaction: vi.fn(async () => {
        throw error;
      }),
    });

    await expect(starter.transfer(effects)).resolves.toMatchObject({
      sourceChainTransaction: { hash: signature },
    });
    await vi.waitFor(() =>
      expect(effects.onRouteExecutionError).toHaveBeenCalledWith(error, expect.any(Object)),
    );
    expect(effects.onRouteUpdate).toHaveBeenLastCalledWith(
      expect.objectContaining({
        steps: [
          expect.objectContaining({
            execution: expect.objectContaining({
              status: 'PENDING',
              process: [expect.objectContaining({ txHash: signature, status: 'PENDING' })],
            }),
          }),
        ],
      }),
    );
    expect(effects.onRouteUpdate).toHaveBeenCalledOnce();
  });

  it.each([new Error('User rejected the request'), new Error('Wallet submission failed')])(
    'propagates submission error: $message',
    async (error) => {
      const confirmTransaction = vi.fn();
      const starter = new SolanaTransferStarter({
        lifiRoute: route(),
        wallet: wallet(vi.fn(async () => Promise.reject(error))),
        prepareStep: vi.fn(async (value) => ({
          ...value,
          transactionRequest: { data: btoa(String.fromCharCode(...serializedTransaction)) },
        })),
        confirmTransaction,
      });

      await expect(starter.transfer(callbacks())).rejects.toBe(error);
      expect(confirmTransaction).not.toHaveBeenCalled();
    },
  );

  it('rejects unsupported multi-step routes before preparing a transaction', async () => {
    const prepareStep = vi.fn();
    const starter = new SolanaTransferStarter({
      lifiRoute: route([step(), { ...step(), id: 'step-2' }]),
      wallet: wallet(),
      prepareStep,
    });

    await expect(starter.transfer(callbacks())).rejects.toThrow(/single-step/i);
    expect(prepareStep).not.toHaveBeenCalled();
  });
});

describe('Solana gas estimates', () => {
  it('keeps quoted fees in lamports, including fees without a compute-unit estimate', async () => {
    const quote = route();
    quote.gas = [
      {
        chainId: ChainId.Solana,
        amount: '5000',
        estimate: '100000',
        token: token(ChainId.Solana),
        details: { id: 'gas', label: 'Gas fee', via: 'LI.FI' },
      },
      {
        chainId: ChainId.Solana,
        amount: '2500',
        token: token(ChainId.Solana),
        details: { id: 'gas', label: 'Gas fee', via: 'LI.FI' },
      },
      {
        chainId: ChainId.ArbitrumOne,
        amount: '200',
        estimate: '20',
        token: token(ChainId.ArbitrumOne),
        details: { id: 'gas', label: 'Gas fee', via: 'LI.FI' },
      },
      {
        chainId: ChainId.Ethereum,
        amount: '999',
        estimate: '999',
        token: token(ChainId.Ethereum),
        details: { id: 'gas', label: 'Gas fee', via: 'LI.FI' },
      },
    ];
    const starter = new SolanaTransferStarter({ lifiRoute: quote });
    await expect(starter.transferEstimateGas()).resolves.toEqual({
      estimatedParentChainGas: BigNumber.from(100000),
      estimatedChildChainGas: BigNumber.from(20),
      estimatedParentChainGasFee: BigNumber.from(7500),
      estimatedChildChainGasFee: BigNumber.from(200),
    });
  });

  it('selects the Solana starter without EVM providers and uses refreshed quote fees', async () => {
    const provider = vi.spyOn(providers, 'getProviderForChainId').mockImplementation(() => {
      throw new Error('Solana estimates must not create an EVM provider');
    });
    try {
      await Promise.all(
        ['5000', '8000'].map(async (amount) => {
          const quote = route();
          quote.gas = [
            {
              chainId: ChainId.Solana,
              amount,
              token: token(ChainId.Solana),
              details: { id: 'gas', label: 'Gas fee', via: 'LI.FI' },
            },
          ];
          const starter = BridgeTransferStarterFactory.create({
            sourceChainId: ChainId.Solana,
            destinationChainId: ChainId.ArbitrumOne,
            lifiRoute: quote,
          });
          expect(starter).toBeInstanceOf(SolanaTransferStarter);
          await expect(
            starter.transferEstimateGas({
              amount: BigNumber.from(1),
              from: 'So11111111111111111111111111111111111111112',
            }),
          ).resolves.toMatchObject({ estimatedParentChainGasFee: BigNumber.from(amount) });
        }),
      );
      expect(provider).not.toHaveBeenCalled();
      expect(() =>
        BridgeTransferStarterFactory.create({
          sourceChainId: ChainId.Solana,
          destinationChainId: ChainId.ArbitrumOne,
        }),
      ).toThrow(/quote/i);
    } finally {
      provider.mockRestore();
    }
  });
});
