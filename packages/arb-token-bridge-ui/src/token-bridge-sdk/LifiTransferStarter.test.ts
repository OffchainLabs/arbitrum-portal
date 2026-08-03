import type { Provider } from '@ethersproject/providers';
import { RouteExtended, executeRoute } from '@lifi/sdk';
import { BigNumber, constants } from 'ethers';
import { UserRejectedRequestError } from 'viem';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { LifiCrosschainTransfersRoute } from '../app/api/crosschain-transfers/lifi';
import type { RouteCost } from '../app/api/crosschain-transfers/types';
import { createMockLifiRoute } from '../test-utils/lifi';
import {
  getExecutedLifiRouteTxHash,
  getLifiRouteStatusRequest,
  getPendingLifiRouteBatchIds,
  resolveLifiRouteBatchId,
} from '../util/LifiTransactionStatus';
import { LifiTransferStarter } from './LifiTransferStarter';

vi.mock('@lifi/sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@lifi/sdk')>();

  return {
    ...actual,
    config: {
      setProviders: vi.fn(),
    },
    EVM: vi.fn((options) => options),
    executeRoute: vi.fn(),
  };
});

const eth = {
  address: constants.AddressZero,
  decimals: 18,
  logoURI: '',
  symbol: 'ETH',
};

function createLifiTransferRoute({
  gas = [],
  fee = [],
  route = createMockLifiRoute(),
}: {
  gas?: RouteCost[];
  fee?: RouteCost[];
  route?: RouteExtended;
} = {}): LifiCrosschainTransfersRoute {
  return {
    type: 'lifi',
    durationMs: 0,
    gas,
    fee,
    fromAmount: { amount: '0', amountUSD: '0', token: eth },
    toAmount: { amount: '0', amountUSD: '0', token: eth },
    fromChainId: 1,
    toChainId: 42161,
    protocolData: { route },
  };
}
const routeTxHash = '0xa0231341aef0576cd9467d1506011d1dd041167762db0d2b1657678e3c0c5255';
const batchId = '0x3ed2270c44494ccfa9c60daf655e7879';
const batchId32Bytes = '0x5f4e4b452a390f349b7fc1f7b9b1666da36199b342de010996606ac8cea5ace1';

function createStarter() {
  return new LifiTransferStarter({
    sourceChainProvider: {
      getNetwork: async () => ({ chainId: 1 }),
      getTransaction: async (hash: string) => ({ hash }),
    } as unknown as Provider,
    destinationChainProvider: {
      getNetwork: async () => ({ chainId: 42161 }),
    } as unknown as Provider,
    lifiRoute: createLifiTransferRoute(),
  });
}

function createTransferProps(
  onApprovalRequest: NonNullable<
    Parameters<LifiTransferStarter['transfer']>[0]['onApprovalRequest']
  >,
): Parameters<LifiTransferStarter['transfer']>[0] {
  return {
    amount: BigNumber.from(1),
    destinationAddress: constants.AddressZero,
    wagmiConfig: {} as Parameters<LifiTransferStarter['transfer']>[0]['wagmiConfig'],
    switchChainAsync: vi.fn().mockResolvedValue(undefined),
    onApprovalRequest,
    onRouteExecutionError: vi.fn(),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getExecutedLifiRouteTxHash', () => {
  it('ignores approval-only transaction hashes', () => {
    const route = {
      steps: [
        {
          execution: {
            process: [
              {
                type: 'TOKEN_ALLOWANCE',
                status: 'DONE',
                txHash: '0xapproval',
              },
            ],
          },
        },
      ],
    } as unknown as RouteExtended;

    expect(getExecutedLifiRouteTxHash(route)).toBeUndefined();
  });

  it('returns the first route execution transaction hash', () => {
    const route = {
      steps: [
        {
          execution: {
            process: [
              {
                type: 'TOKEN_ALLOWANCE',
                status: 'DONE',
                txHash: '0xapproval',
              },
              {
                type: 'CROSS_CHAIN',
                status: 'PENDING',
                txHash: routeTxHash,
              },
            ],
          },
        },
      ],
    } as unknown as RouteExtended;

    expect(getExecutedLifiRouteTxHash(route)).toBe(routeTxHash);
  });

  it.each(['ACTION_REQUIRED', 'CANCELLED'] as const)(
    'does not treat a %s process as an accepted transaction',
    (status) => {
      const route = {
        steps: [
          {
            execution: {
              process: [
                {
                  type: 'CROSS_CHAIN',
                  status,
                  txHash: batchId32Bytes,
                  txType: 'batched',
                },
              ],
            },
          },
        ],
      } as unknown as RouteExtended;

      expect(getExecutedLifiRouteTxHash(route)).toBeUndefined();
    },
  );

  it('ignores EIP-5792 batch ids until LiFi updates the route with a transaction hash', () => {
    const routeWithBatchId = {
      steps: [
        {
          execution: {
            process: [
              {
                type: 'CROSS_CHAIN',
                status: 'PENDING',
                txHash: batchId32Bytes,
                txType: 'batched',
              },
            ],
          },
        },
      ],
    } as unknown as RouteExtended;
    const routeWithTransactionHash = {
      steps: [
        {
          execution: {
            process: [
              {
                type: 'CROSS_CHAIN',
                status: 'PENDING',
                txHash: routeTxHash,
                txType: 'batched',
                txLink: `https://etherscan.io/tx/${routeTxHash}`,
              },
            ],
          },
        },
      ],
    } as unknown as RouteExtended;

    expect(getExecutedLifiRouteTxHash(routeWithBatchId)).toBeUndefined();
    expect(getExecutedLifiRouteTxHash(routeWithTransactionHash)).toBe(routeTxHash);
  });

  it('replaces a submitted batch id with its route transaction receipt', () => {
    const routeWithBatchId = {
      steps: [
        {
          execution: {
            process: [
              {
                type: 'CROSS_CHAIN',
                status: 'PENDING',
                txHash: batchId32Bytes,
                txType: 'batched',
              },
            ],
          },
        },
      ],
    } as unknown as RouteExtended;
    const txLink = `https://etherscan.io/tx/${routeTxHash}`;

    expect(getPendingLifiRouteBatchIds(routeWithBatchId)).toEqual([batchId32Bytes]);

    const resolvedRoute = resolveLifiRouteBatchId({
      route: routeWithBatchId,
      batchId: batchId32Bytes,
      txHash: routeTxHash,
      txLink,
    });

    expect(getPendingLifiRouteBatchIds(resolvedRoute)).toEqual([]);
    expect(getExecutedLifiRouteTxHash(resolvedRoute)).toBe(routeTxHash);
    expect(resolvedRoute.steps[0]?.execution?.process[0]).toMatchObject({
      txHash: routeTxHash,
      txLink,
      txType: 'batched',
    });
  });

  it('keeps a failed on-chain transaction as an executed transaction', () => {
    const route = {
      steps: [
        {
          execution: {
            process: [
              {
                type: 'CROSS_CHAIN',
                status: 'FAILED',
                txHash: routeTxHash,
                txLink: `https://etherscan.io/tx/${routeTxHash}`,
              },
            ],
          },
        },
      ],
    } as unknown as RouteExtended;

    expect(getExecutedLifiRouteTxHash(route)).toBe(routeTxHash);
  });

  it('keeps the first executed transaction when a later step fails', () => {
    const route = {
      steps: [
        {
          execution: {
            process: [{ type: 'CROSS_CHAIN', status: 'DONE', txHash: routeTxHash }],
          },
        },
        {
          execution: {
            process: [
              {
                type: 'SWAP',
                status: 'FAILED',
                txHash: '0x9e3a93e15e2c778c56efba7af7016e0dd149769dd6b087da8c2d92e2e24580b4',
              },
            ],
          },
        },
      ],
    } as unknown as RouteExtended;

    expect(getExecutedLifiRouteTxHash(route)).toBe(routeTxHash);
  });
});

describe('getLifiRouteStatusRequest', () => {
  it('returns the cross-chain step details instead of source or destination swap details', () => {
    const sourceSwapTxHash = '0x9e3a93e15e2c778c56efba7af7016e0dd149769dd6b087da8c2d92e2e24580b4';
    const destinationSwapTxHash =
      '0x3d731a1bd638a2902172994ba6447f4a1c59275b9711500446ab1ee8c9df6017';
    const route = {
      steps: [
        {
          tool: 'across',
          action: { fromChainId: 42161, toChainId: 4663 },
          execution: {
            process: [
              { type: 'SWAP', status: 'DONE', txHash: sourceSwapTxHash },
              { type: 'CROSS_CHAIN', status: 'DONE', txHash: routeTxHash },
            ],
          },
        },
        {
          tool: 'sushi',
          action: { fromChainId: 4663, toChainId: 4663 },
          execution: {
            process: [
              { type: 'TOKEN_ALLOWANCE', status: 'DONE', txHash: '0xapproval' },
              { type: 'SWAP', status: 'FAILED', txHash: destinationSwapTxHash },
            ],
          },
        },
      ],
    } as unknown as RouteExtended;

    expect(getLifiRouteStatusRequest(route)).toEqual({
      params: {
        txHash: routeTxHash,
        bridge: 'across',
        fromChain: '42161',
        toChain: '4663',
      },
      stepIndex: 0,
    });
  });

  it('waits for a real cross-chain hash instead of using another execution hash', () => {
    const route = {
      steps: [
        {
          tool: 'across',
          action: { fromChainId: 42161, toChainId: 4663 },
          execution: {
            process: [
              { type: 'SWAP', status: 'DONE', txHash: routeTxHash },
              {
                type: 'CROSS_CHAIN',
                status: 'PENDING',
                txHash: batchId32Bytes,
                txType: 'batched',
              },
            ],
          },
        },
      ],
    } as unknown as RouteExtended;

    expect(getLifiRouteStatusRequest(route)).toBeUndefined();
  });
});

describe.sequential('LifiTransferStarter approvals', () => {
  it('asks for approval through each LiFi approval transaction request hook', async () => {
    const onApprovalRequest = vi.fn().mockResolvedValue(true);
    const executedRoute = {
      id: 'route-id',
      steps: [
        {
          execution: {
            process: [
              {
                type: 'SWAP',
                status: 'PENDING',
                txHash: routeTxHash,
              },
            ],
          },
        },
      ],
    } as unknown as RouteExtended;

    vi.mocked(executeRoute).mockImplementationOnce(async (_route, executionOptions) => {
      await executionOptions?.updateTransactionRequestHook?.({
        requestType: 'approve',
        to: '0xsourcetoken',
        data: '0xsourceapprove',
      });
      await executionOptions?.updateTransactionRequestHook?.({
        requestType: 'approve',
        to: '0xdestinationtoken',
        data: '0xdestinationapprove',
      });
      await executionOptions?.updateTransactionRequestHook?.({
        requestType: 'transaction',
        to: '0xbridge',
        data: '0xbridge',
      });
      executionOptions?.updateRouteHook?.(executedRoute);
      return executedRoute;
    });

    await createStarter().transfer(createTransferProps(onApprovalRequest));

    expect(onApprovalRequest).toHaveBeenCalledTimes(2);
    expect(onApprovalRequest).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        to: '0xsourcetoken',
        data: '0xsourceapprove',
      }),
    );
    expect(onApprovalRequest).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        to: '0xdestinationtoken',
        data: '0xdestinationapprove',
      }),
    );
  });

  it('waits for a real transaction hash while reporting every route update', async () => {
    const onRouteUpdate = vi.fn();
    const routeWithBatchId = {
      id: 'route-id',
      steps: [
        {
          execution: {
            process: [
              {
                type: 'CROSS_CHAIN',
                status: 'PENDING',
                txHash: batchId,
                txType: 'batched',
              },
            ],
          },
        },
      ],
    } as unknown as RouteExtended;
    const routeWithTransactionHash = {
      id: 'route-id',
      steps: [
        {
          execution: {
            process: [
              {
                type: 'CROSS_CHAIN',
                status: 'PENDING',
                txHash: routeTxHash,
                txType: 'batched',
                txLink: `https://etherscan.io/tx/${routeTxHash}`,
              },
            ],
          },
        },
      ],
    } as unknown as RouteExtended;

    vi.mocked(executeRoute).mockImplementationOnce(async (_route, executionOptions) => {
      executionOptions?.updateRouteHook?.(routeWithBatchId);
      executionOptions?.updateRouteHook?.(routeWithTransactionHash);
      return routeWithTransactionHash;
    });

    const transferProps = createTransferProps(vi.fn());
    transferProps.onRouteUpdate = onRouteUpdate;

    await expect(createStarter().transfer(transferProps)).resolves.toMatchObject({
      sourceChainTransaction: {
        hash: routeTxHash,
      },
      lifiRoute: routeWithTransactionHash,
    });
    expect(onRouteUpdate).toHaveBeenCalledWith(routeWithBatchId);
    expect(onRouteUpdate).toHaveBeenCalledWith(routeWithTransactionHash);
  });

  it('reports a rejected wallet request with failed route state', async () => {
    const onRouteUpdate = vi.fn();
    const onRouteExecutionError = vi.fn();
    const routeWithBatchId = {
      id: 'rejected-route-id',
      steps: [
        {
          execution: {
            process: [
              {
                type: 'CROSS_CHAIN',
                status: 'PENDING',
                txHash: batchId,
                txType: 'batched',
              },
            ],
          },
        },
      ],
    } as unknown as RouteExtended;
    const rejectionError = new Error('bundle id is unknown');

    vi.mocked(executeRoute).mockImplementationOnce(async (_route, executionOptions) => {
      executionOptions?.updateRouteHook?.(routeWithBatchId);
      throw rejectionError;
    });
    const transferProps = createTransferProps(vi.fn());
    transferProps.onRouteUpdate = onRouteUpdate;
    transferProps.onRouteExecutionError = onRouteExecutionError;

    await expect(createStarter().transfer(transferProps)).rejects.toBe(rejectionError);
    await vi.waitFor(() => {
      expect(onRouteExecutionError).toHaveBeenCalledWith(
        rejectionError,
        expect.objectContaining({
          steps: [
            expect.objectContaining({
              execution: expect.objectContaining({
                status: 'FAILED',
                process: [expect.objectContaining({ status: 'FAILED' })],
              }),
            }),
          ],
        }),
      );
    });
    expect(onRouteUpdate).toHaveBeenCalledWith(routeWithBatchId);
  });

  it('reports one route update that contains an accepted hash and a later batch', async () => {
    const onRouteUpdate = vi.fn();
    const mixedRoute = {
      id: 'mixed-route-id',
      steps: [
        {
          execution: {
            status: 'DONE',
            process: [{ type: 'CROSS_CHAIN', status: 'DONE', txHash: routeTxHash }],
          },
        },
        {
          execution: {
            status: 'PENDING',
            process: [
              {
                type: 'SWAP',
                status: 'PENDING',
                txHash: batchId,
                txType: 'batched',
              },
            ],
          },
        },
      ],
    } as unknown as RouteExtended;

    vi.mocked(executeRoute).mockImplementationOnce(async (_route, executionOptions) => {
      executionOptions?.updateRouteHook?.(mixedRoute);
      return mixedRoute;
    });
    const transferProps = createTransferProps(vi.fn());
    transferProps.onRouteUpdate = onRouteUpdate;

    await createStarter().transfer(transferProps);

    expect(onRouteUpdate).toHaveBeenCalledWith(mixedRoute);
  });

  it('marks a later rejected EOA request as resumable route state', async () => {
    const rejectionError = { code: 4001, message: 'User rejected the request' };
    const onRouteExecutionError = vi.fn();
    const routeWithPendingRequest = {
      id: 'rejected-eoa-route-id',
      steps: [
        {
          execution: {
            status: 'DONE',
            process: [{ type: 'CROSS_CHAIN', status: 'DONE', txHash: routeTxHash }],
          },
        },
        {
          execution: {
            status: 'PENDING',
            process: [{ type: 'SWAP', status: 'PENDING' }],
          },
        },
      ],
    } as unknown as RouteExtended;

    vi.mocked(executeRoute).mockImplementationOnce(async (_route, executionOptions) => {
      executionOptions?.updateRouteHook?.(routeWithPendingRequest);
      throw rejectionError;
    });
    const transferProps = createTransferProps(vi.fn());
    transferProps.onRouteExecutionError = onRouteExecutionError;

    await createStarter().transfer(transferProps);

    await vi.waitFor(() => {
      expect(onRouteExecutionError).toHaveBeenCalledWith(
        rejectionError,
        expect.objectContaining({
          steps: [
            routeWithPendingRequest.steps[0],
            expect.objectContaining({
              execution: expect.objectContaining({
                status: 'FAILED',
                process: [expect.objectContaining({ status: 'FAILED' })],
              }),
            }),
          ],
        }),
      );
    });
  });

  it('reports route failures that happen after the first transaction is submitted', async () => {
    const executionError = new Error('destination step failed');
    const onRouteExecutionError = vi.fn();
    const submittedRoute = {
      id: 'route-id',
      steps: [
        {
          execution: {
            process: [
              {
                type: 'CROSS_CHAIN',
                status: 'PENDING',
                txHash: routeTxHash,
              },
            ],
          },
        },
      ],
    } as unknown as RouteExtended;

    vi.mocked(executeRoute).mockImplementationOnce(async (_route, executionOptions) => {
      executionOptions?.updateRouteHook?.(submittedRoute);
      throw executionError;
    });
    const transferProps = createTransferProps(vi.fn());
    transferProps.onRouteExecutionError = onRouteExecutionError;

    await createStarter().transfer(transferProps);

    expect(onRouteExecutionError).toHaveBeenCalledWith(executionError, submittedRoute);
  });

  it("rejects route execution when the app's token approval dialog is declined", async () => {
    const onApprovalRequest = vi.fn().mockResolvedValue(false);

    vi.mocked(executeRoute).mockImplementationOnce(async (_route, executionOptions) => {
      await executionOptions?.updateTransactionRequestHook?.({
        requestType: 'approve',
        to: '0xtoken',
        data: '0xapprove',
      });
      throw new Error('unreachable');
    });

    await expect(
      createStarter().transfer(createTransferProps(onApprovalRequest)),
    ).rejects.toBeInstanceOf(UserRejectedRequestError);
    expect(onApprovalRequest).toHaveBeenCalledTimes(1);
  });
});

describe('LifiTransferStarter estimates', () => {
  it('aggregates gas estimates by source and destination chain', async () => {
    const starter = new LifiTransferStarter({
      sourceChainProvider: {
        getNetwork: async () => ({ chainId: 1 }),
      } as unknown as Provider,
      destinationChainProvider: {
        getNetwork: async () => ({ chainId: 42161 }),
      } as unknown as Provider,
      lifiRoute: createLifiTransferRoute({
        gas: [
          {
            amount: '100',
            amountUSD: '1',
            token: eth,
            chainId: 1,
            estimate: '10',
            details: { id: 'source-gas', label: 'Source gas fee', via: 'LI.FI' },
          },
          {
            amount: '999',
            amountUSD: '9.99',
            token: eth,
            chainId: 1,
            details: { id: 'ignored-gas', label: 'Ignored gas fee', via: 'LI.FI' },
          },
          {
            amount: '200',
            amountUSD: '2',
            token: eth,
            chainId: 42161,
            estimate: '20',
            details: { id: 'destination-gas', label: 'Destination gas fee', via: 'LI.FI' },
          },
        ],
      }),
    });

    await expect(starter.transferEstimateGas()).resolves.toEqual({
      estimatedParentChainGas: BigNumber.from(10),
      estimatedChildChainGas: BigNumber.from(20),
    });
  });
});
