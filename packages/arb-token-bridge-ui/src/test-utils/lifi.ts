import type { RouteExtended } from '@lifi/sdk';

import { AssetType } from '../hooks/arbTokenBridge.types';
import type { LifiMergedTransaction } from '../state/app/state';
import { DepositStatus, WithdrawalStatus } from '../state/app/state';
import { ChainId } from '../types/ChainId';

type CreateMockLifiRouteOptions = Partial<Omit<RouteExtended, 'id' | 'steps'>> & {
  id?: string;
  steps?: RouteExtended['steps'];
};

export function createMockLifiRoute({
  id = 'route-id',
  steps = [],
  ...overrides
}: CreateMockLifiRouteOptions = {}): RouteExtended {
  const firstStep = steps[0];
  const lastStep = steps.at(-1);
  const fromChainId = firstStep?.action.fromChainId ?? 1;
  const toChainId = lastStep?.action.toChainId ?? 42161;
  const fromToken = firstStep?.action.fromToken ?? {
    address: '0x0000000000000000000000000000000000000000',
    chainId: fromChainId,
    decimals: 18,
    name: 'Ether',
    priceUSD: '1',
    symbol: 'ETH',
  };
  const toToken = lastStep?.action.toToken ?? { ...fromToken, chainId: toChainId };

  return {
    id,
    insurance: { state: 'NOT_INSURABLE', feeAmountUsd: '0' },
    fromChainId,
    fromAmountUSD: firstStep?.estimate.fromAmountUSD ?? '0',
    fromAmount: firstStep?.action.fromAmount ?? '0',
    fromToken,
    toChainId,
    toAmountUSD: lastStep?.estimate.toAmountUSD ?? '0',
    toAmount: lastStep?.estimate.toAmount ?? '0',
    toAmountMin: lastStep?.estimate.toAmountMin ?? '0',
    toToken,
    steps,
    ...overrides,
  };
}

export function createMockLifiTransaction(
  overrides: Partial<LifiMergedTransaction> = {},
): LifiMergedTransaction {
  const sourceChainId = overrides.sourceChainId ?? 1;
  const destinationChainId = overrides.destinationChainId ?? 42161;
  const sender = overrides.sender ?? '0x1111111111111111111111111111111111111111';
  const token = {
    address: '0x0000000000000000000000000000000000000000',
    decimals: 18,
    logoURI: '',
    symbol: 'ETH',
  };

  return {
    txId: '0xa0231341aef0576cd9467d1506011d1dd041167762db0d2b1657678e3c0c5255',
    asset: token.symbol,
    assetType: AssetType.ETH,
    blockNum: null,
    createdAt: 1_700_000_000_000,
    direction: 'deposit',
    isWithdrawal: false,
    resolvedAt: null,
    status: WithdrawalStatus.UNCONFIRMED,
    destinationStatus: WithdrawalStatus.UNCONFIRMED,
    uniqueId: null,
    value: '1',
    depositStatus: DepositStatus.LIFI_DEFAULT_STATE,
    destination: sender,
    sender,
    isLifi: true,
    tokenAddress: token.address,
    parentChainId: sourceChainId,
    childChainId: destinationChainId,
    sourceChainId,
    destinationChainId,
    toolsDetails: [{ key: 'lifi', name: 'LiFi', logoURI: '/icons/lifi.svg' }],
    durationMs: 0,
    fromAmount: { amount: '1', amountUSD: '0', token },
    toAmount: { amount: '1', amountUSD: '0', token },
    destinationTxId: null,
    ...overrides,
  };
}

export function createMockLifiBatchedTransaction(): LifiMergedTransaction {
  const sourceChainId: number = ChainId.ArbitrumOne;
  const destinationChainId: number = ChainId.RobinhoodChain;
  const txId = `0x${'1'.repeat(64)}`;
  const token = {
    address: `0x${'2'.repeat(40)}`,
    chainId: sourceChainId,
    decimals: 6,
    name: 'USD Coin',
    priceUSD: '1',
    symbol: 'USDC',
  };
  const destinationToken = { ...token, chainId: destinationChainId };
  const bridge: RouteExtended['steps'][number] = {
    id: 'bridge',
    type: 'lifi',
    tool: 'relay',
    toolDetails: { key: 'relay', name: 'Relay', logoURI: '' },
    includedSteps: [],
    action: {
      fromChainId: sourceChainId,
      toChainId: destinationChainId,
      fromAmount: '1000000',
      fromToken: token,
      toToken: destinationToken,
      slippage: 0.005,
    },
    estimate: {
      tool: 'relay',
      fromAmount: '1000000',
      toAmount: '1000000',
      toAmountMin: '990000',
      approvalAddress: token.address,
      executionDuration: 30,
    },
    execution: {
      startedAt: 1,
      status: 'DONE',
      process: [
        {
          type: 'CROSS_CHAIN',
          status: 'DONE',
          startedAt: 1,
          txHash: txId,
          txLink: `https://arbiscan.io/tx/${txId}`,
        },
      ],
    },
  };
  const swap: RouteExtended['steps'][number] = {
    ...bridge,
    id: 'destination-swap',
    action: { ...bridge.action, fromChainId: destinationChainId, fromToken: destinationToken },
    execution: {
      startedAt: 2,
      status: 'PENDING',
      process: [
        { type: 'TOKEN_ALLOWANCE', status: 'DONE', startedAt: 2 },
        {
          type: 'SWAP',
          status: 'PENDING',
          startedAt: 3,
          txType: 'batched',
          txHash: `0x${'3'.repeat(64)}`,
        },
      ],
    },
  };
  return createMockLifiTransaction({
    txId,
    sourceChainId,
    destinationChainId,
    status: WithdrawalStatus.CONFIRMED,
    lifiRoute: createMockLifiRoute({ steps: [bridge, swap] }),
  });
}
