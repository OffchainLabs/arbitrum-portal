import type { Provider } from '@ethersproject/providers';
import { RouteExtended, executeRoute } from '@lifi/sdk';
import { BigNumber, constants } from 'ethers';
import { UserRejectedRequestError } from 'viem';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { LifiCrosschainTransfersRoute } from '../app/api/crosschain-transfers/lifi';
import type { RouteCost } from '../app/api/crosschain-transfers/types';
import {
  getExecutedLifiRouteTxHash,
  getSubmittedLifiRouteTxHash,
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

function createLifiRoute({
  gas = [],
  fee = [],
  route = { id: 'route-id', steps: [] } as unknown as RouteExtended,
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
    protocolData: { orders: [], route },
  };
}
const routeTxHash = '0xa0231341aef0576cd9467d1506011d1dd041167762db0d2b1657678e3c0c5255';
const batchId = '0x3ed2270c44494ccfa9c60daf655e7879';

function createStarter() {
  return new LifiTransferStarter({
    sourceChainProvider: {
      getNetwork: async () => ({ chainId: 1 }),
      getTransaction: async (hash: string) => ({ hash }),
    } as unknown as Provider,
    destinationChainProvider: {
      getNetwork: async () => ({ chainId: 42161 }),
    } as unknown as Provider,
    lifiRoute: createLifiRoute(),
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
    signer: {} as Parameters<LifiTransferStarter['transfer']>[0]['signer'],
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

  it('ignores EIP-5792 batch ids until LiFi updates the route with a transaction hash', () => {
    const routeWithBatchId = {
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
      steps: [
        {
          execution: {
            process: [
              {
                type: 'CROSS_CHAIN',
                status: 'PENDING',
                txHash: routeTxHash,
                txType: 'batched',
              },
            ],
          },
        },
      ],
    } as unknown as RouteExtended;

    expect(getExecutedLifiRouteTxHash(routeWithBatchId)).toBeUndefined();
    expect(getSubmittedLifiRouteTxHash(routeWithBatchId)).toBe(batchId);
    expect(getExecutedLifiRouteTxHash(routeWithTransactionHash)).toBe(routeTxHash);
    expect(getSubmittedLifiRouteTxHash(routeWithTransactionHash)).toBe(routeTxHash);
  });
});

describe('LifiTransferStarter approvals', () => {
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

  it('returns the submitted route id so batched calls are tracked in history', async () => {
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

    await expect(createStarter().transfer(createTransferProps(vi.fn()))).resolves.toMatchObject({
      sourceChainTransaction: {
        hash: batchId,
      },
      lifiRoute: routeWithBatchId,
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

    expect(onRouteExecutionError).toHaveBeenCalledWith(executionError);
  });

  it('rejects route execution when the approval modal is declined', async () => {
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
      lifiRoute: createLifiRoute({
        gas: [
          {
            amount: '100',
            amountUSD: '1',
            token: eth,
            chainId: 1,
            estimate: '10',
          },
          {
            amount: '999',
            amountUSD: '9.99',
            token: eth,
            chainId: 1,
          },
          {
            amount: '200',
            amountUSD: '2',
            token: eth,
            chainId: 42161,
            estimate: '20',
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
