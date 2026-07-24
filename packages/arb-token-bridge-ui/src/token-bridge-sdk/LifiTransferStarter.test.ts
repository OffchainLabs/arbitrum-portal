import type { Provider } from '@ethersproject/providers';
import { RouteExtended, executeRoute } from '@lifi/sdk';
import { BigNumber, constants } from 'ethers';
import { UserRejectedRequestError } from 'viem';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getExecutedLifiRouteTxHash,
  getSubmittedLifiRouteTxHash,
} from '../util/LifiTransactionStatus';
import { LifiData, LifiTransferStarter } from './LifiTransferStarter';

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

function createLifiData({
  gasAmount = BigNumber.from(0),
  feeAmount = BigNumber.from(0),
  route = { id: 'route-id', steps: [] } as unknown as RouteExtended,
}: {
  gasAmount?: BigNumber;
  feeAmount?: BigNumber;
  route?: RouteExtended;
} = {}): LifiData {
  return {
    spenderAddress: constants.AddressZero,
    gas: { amount: gasAmount, amountUSD: '0', token: eth },
    fee: { amount: feeAmount, amountUSD: '0', token: eth },
    route,
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
    lifiData: createLifiData(),
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

  it('waits for the on-chain transaction hash when a wallet first reports a batch id', async () => {
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
        hash: routeTxHash,
      },
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
  it('uses the existing scalar gas estimate for a deposit', async () => {
    const starter = new LifiTransferStarter({
      sourceChainProvider: {
        getNetwork: async () => ({ chainId: 1 }),
      } as unknown as Provider,
      destinationChainProvider: {
        getNetwork: async () => ({ chainId: 42161 }),
      } as unknown as Provider,
      lifiData: createLifiData({ gasAmount: BigNumber.from(10) }),
    });

    await expect(starter.transferEstimateGas()).resolves.toEqual({
      estimatedParentChainGas: BigNumber.from(10),
      estimatedChildChainGas: constants.Zero,
    });
  });
});
