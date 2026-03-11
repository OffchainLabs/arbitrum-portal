'use client';

import { useCallback, useState } from 'react';
import { type Address, type Hex } from 'viem';
import { useAccount, useConfig } from 'wagmi';
import {
  getAccount,
  getCallsStatus,
  sendCalls,
  sendTransaction,
  switchChain,
  waitForTransactionReceipt,
} from 'wagmi/actions';

import { useIsTxBatchingSupported } from '@/app-hooks/useIsTxBatchingSupported';
import { isUserRejectedError } from '@/bridge/util/isUserRejectedError';
import type { TransactionStep } from '@/earn-api/types';

import { validateTransactionStep } from './useEarnTransactionUtils';

export interface TransactionCall {
  to: Address;
  data: Hex;
  value?: bigint;
  chainId: number;
}

export interface EarnTransactionExecutionOptions {
  chainId: number;
  transactionSteps: TransactionStep[] | undefined;
  onTransactionSubmitted?: (params: { txHash: string | undefined; amount: string }) => void;
  onTransactionFinished: (params: { txHash: string | undefined; amount: string }) => void;
  inputAmount: string;
}

export interface UseEarnTransactionExecutionResult {
  executeTx: () => Promise<void>;
  isBatchSupported: boolean;
  currentActionIndex: number;
  isExecuting: boolean;
}

const MAX_BATCH_POLL_ATTEMPTS = 120; // ~2 minutes at 1s intervals
const POLL_INTERVAL_MS = 1000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildTransactionCalls(transactionSteps: TransactionStep[]): TransactionCall[] {
  return transactionSteps.map((step: TransactionStep, index: number) => {
    validateTransactionStep(step, index);
    return {
      to: step.to as `0x${string}`,
      data: step.data as `0x${string}`,
      value: step.value ? BigInt(step.value) : undefined,
      chainId: step.chainId,
    };
  });
}

function isEip7702RelatedError(e: unknown) {
  const err = e as { message?: string; shortMessage?: string };
  const msg = (err.message ?? '').toLowerCase();
  const shortMsg = (err.shortMessage ?? '').toLowerCase();
  const combined = `${msg} ${shortMsg}`;
  return combined.includes('eip-7702') || combined.includes('7702 not supported');
}

async function waitForBatchTxHash(
  wagmiConfig: Parameters<typeof getCallsStatus>[0],
  batchId: string,
) {
  for (let attempt = 0; attempt < MAX_BATCH_POLL_ATTEMPTS; attempt++) {
    // eslint-disable-next-line no-await-in-loop
    const callsStatus = await getCallsStatus(wagmiConfig, { id: batchId });

    if (callsStatus.status === 'failure') {
      throw new Error('Batch calls failed');
    }

    if (callsStatus.status !== 'pending') {
      const receipt = callsStatus.receipts?.[0];
      if (!receipt) {
        throw new Error('Batch completed but no receipt found');
      }
      const txHash = receipt.transactionHash;
      if (!txHash) {
        throw new Error('Batch completed but transaction hash not found in receipt');
      }
      return txHash;
    }

    // eslint-disable-next-line no-await-in-loop
    await sleep(POLL_INTERVAL_MS);
  }

  throw new Error('Batch transaction timed out');
}

export function useEarnTransactionExecution({
  chainId,
  transactionSteps,
  onTransactionSubmitted,
  onTransactionFinished,
  inputAmount,
}: EarnTransactionExecutionOptions): UseEarnTransactionExecutionResult {
  const wagmiConfig = useConfig();
  const { chainId: connectedChainId } = useAccount();
  const isBatchSupported = useIsTxBatchingSupported(chainId);
  const [currentActionIndex, setCurrentActionIndex] = useState(0);
  const [isExecuting, setIsExecuting] = useState(false);

  const executeTx = useCallback(async () => {
    setIsExecuting(true);
    setCurrentActionIndex(0);

    try {
      const ensureCorrectChain = async () => {
        if (!chainId) {
          throw new Error('Invalid transaction chain');
        }

        if (connectedChainId !== chainId) {
          await switchChain(wagmiConfig, { chainId });
        }

        const activeChainId = getAccount(wagmiConfig).chainId;
        if (activeChainId !== chainId) {
          throw new Error('Please switch to Arbitrum One');
        }
      };

      const getCallsOrThrow = () => {
        if (!transactionSteps || transactionSteps.length === 0) {
          throw new Error('No transaction steps found');
        }
        const calls = buildTransactionCalls(transactionSteps);

        for (const [index, call] of calls.entries()) {
          if (call.chainId !== chainId) {
            throw new Error(
              `Invalid transaction step ${index + 1}: chain ${call.chainId} does not match ${chainId}`,
            );
          }
        }

        return calls;
      };

      const executeBatch = async () => {
        await ensureCorrectChain();
        const calls = getCallsOrThrow();

        const { id: batchId } = await sendCalls(wagmiConfig, { calls });

        if (onTransactionSubmitted) {
          onTransactionSubmitted({ txHash: undefined, amount: inputAmount });
        }

        const batchTxHash = await waitForBatchTxHash(wagmiConfig, batchId);
        onTransactionFinished({ txHash: batchTxHash, amount: inputAmount });
      };

      const executeSequential = async () => {
        await ensureCorrectChain();
        const calls = getCallsOrThrow();

        let lastTxHash: string | undefined;

        // Send steps sequentially to preserve nonce order and avoid RPC rate-limit issues.
        for (const [index, currentCall] of calls.entries()) {
          setCurrentActionIndex(index);

          // eslint-disable-next-line no-await-in-loop
          const hash = await sendTransaction(wagmiConfig, {
            to: currentCall.to,
            data: currentCall.data,
            chainId: currentCall.chainId,
            value: currentCall.value,
          });

          lastTxHash = hash;

          if (onTransactionSubmitted && index === calls.length - 1) {
            onTransactionSubmitted({ txHash: hash, amount: inputAmount });
          }

          // eslint-disable-next-line no-await-in-loop
          await waitForTransactionReceipt(wagmiConfig, { hash });
        }

        onTransactionFinished({ txHash: lastTxHash, amount: inputAmount });
      };

      if (isBatchSupported) {
        try {
          await executeBatch();
        } catch (e) {
          if (isEip7702RelatedError(e)) {
            await executeSequential();
          } else {
            throw e;
          }
        }
      } else {
        await executeSequential();
      }
    } catch (error) {
      if (isUserRejectedError(error)) {
        return;
      }
      throw error;
    } finally {
      setIsExecuting(false);
      setCurrentActionIndex(0);
    }
  }, [
    chainId,
    connectedChainId,
    isBatchSupported,
    transactionSteps,
    onTransactionSubmitted,
    onTransactionFinished,
    inputAmount,
    wagmiConfig,
  ]);

  return {
    executeTx,
    isBatchSupported,
    currentActionIndex,
    isExecuting,
  };
}
