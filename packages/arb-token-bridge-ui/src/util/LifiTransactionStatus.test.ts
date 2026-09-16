import bs58 from 'bs58';
import { describe, expect, it } from 'vitest';

import { createMockLifiRoute } from '../test-utils/lifi';
import { ChainId } from '../types/ChainId';
import { getExecutedLifiRouteTxHash, getLifiRouteStatusRequest } from './LifiTransactionStatus';

describe('submitted LiFi transaction IDs', () => {
  const signature = bs58.encode(Uint8Array.from({ length: 64 }, (_, index) => index + 1));
  const hash = `0x${'ab'.repeat(32)}`;

  it.each([
    { chainId: ChainId.Solana, txHash: signature },
    { chainId: ChainId.Ethereum, txHash: hash },
  ])('polls real transaction IDs on chain $chainId', ({ chainId, txHash }) => {
    const route = createMockLifiRoute({ fromChainId: chainId });
    const process = {
      type: 'CROSS_CHAIN' as const,
      status: 'PENDING' as const,
      startedAt: 1,
      txHash,
    };
    const step = {
      id: 'bridge',
      type: 'lifi' as const,
      tool: 'bridge',
      includedSteps: [],
      toolDetails: { key: 'bridge', name: 'Bridge', logoURI: '' },
      action: {
        fromChainId: chainId,
        toChainId: ChainId.ArbitrumOne,
        fromAmount: '1',
        fromToken: route.fromToken,
        toToken: route.toToken,
      },
      estimate: {
        tool: 'bridge',
        fromAmount: '1',
        toAmount: '1',
        toAmountMin: '1',
        approvalAddress: '',
        executionDuration: 60,
      },
      execution: {
        startedAt: 1,
        status: 'PENDING' as const,
        process: [process],
      },
    };
    route.steps = [step];
    expect(getExecutedLifiRouteTxHash(route)).toBe(txHash);
    expect(getLifiRouteStatusRequest(route)?.params).toMatchObject({
      txHash,
      fromChain: String(chainId),
    });

    route.steps = [
      {
        ...step,
        execution: {
          ...step.execution,
          process: [{ ...process, txType: 'batched', txLink: '' }],
        },
      },
    ];
    expect(getExecutedLifiRouteTxHash(route)).toBeUndefined();
    expect(getLifiRouteStatusRequest(route)).toBeUndefined();
  });
});
