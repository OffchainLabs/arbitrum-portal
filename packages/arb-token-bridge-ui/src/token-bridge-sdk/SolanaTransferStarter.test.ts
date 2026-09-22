import type { LiFiStep } from '@lifi/sdk';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { LifiCrosschainTransfersRoute } from '../app/api/crosschain-transfers/lifi';
import { createMockLifiRoute } from '../test-utils/lifi';
import { ChainId } from '../types/ChainId';
import type { SolanaWalletHandle } from '../wallet/types';
import { SolanaTransferStarter } from './SolanaTransferStarter';

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
  beforeEach(() => vi.clearAllMocks());

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
