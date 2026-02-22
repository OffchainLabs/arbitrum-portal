import { useCallback, useState } from 'react';
import { type Address, type Hex } from 'viem';
import { useAccount, useConfig } from 'wagmi';
import {
  getCallsStatus,
  sendCalls,
  sendTransaction,
  switchChain,
  waitForTransactionReceipt,
} from 'wagmi/actions';

import { useIsTxBatchingSupported } from '@/app-hooks/useIsTxBatchingSupported';
import { isUserRejectedError } from '@/bridge/util/isUserRejectedError';

export interface TransactionCall {
  to: Address;
  data: Hex;
  value?: bigint;
  chainId: number;
}

export interface EarnTransactionExecutionOptions {
  chainId: number;
  buildCalls: () => TransactionCall[] | Promise<TransactionCall[]>;
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

export function useEarnTransactionExecution({
  chainId,
  buildCalls,
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
        if (connectedChainId !== chainId) {
          await switchChain(wagmiConfig, { chainId });
        }
      };

      const executeBatch = async () => {
        await ensureCorrectChain();
        const calls = await Promise.resolve(buildCalls());

        if (calls.length === 0) {
          throw new Error('No calls to execute');
        }

        const { id: batchId } = await sendCalls(wagmiConfig, { calls });

        if (onTransactionSubmitted) {
          onTransactionSubmitted({ txHash: undefined, amount: inputAmount });
        }

        const MAX_POLL_ATTEMPTS = 120; // ~2 minutes at 1s intervals
        let batchTxHash: string | undefined;

        for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
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
            batchTxHash = txHash;
            break;
          }

          // eslint-disable-next-line no-await-in-loop
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        if (!batchTxHash) {
          throw new Error('Batch transaction timed out');
        }
        onTransactionFinished({ txHash: batchTxHash, amount: inputAmount });
      };

      const executeSequential = async () => {
        await ensureCorrectChain();
        const calls = await Promise.resolve(buildCalls());

        if (calls.length === 0) {
          throw new Error('No calls to execute');
        }

        let lastTxHash: string | undefined;

        for (let index = 0; index < calls.length; index++) {
          setCurrentActionIndex(index);
          const call = calls[index];
          if (!call) {
            throw new Error(`No call found at index ${index}`);
          }

          const currentCall = call;

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

      const isEip7702RelatedError = (e: unknown) => {
        const err = e as { message?: string; shortMessage?: string };
        const msg = (err.message ?? '').toLowerCase();
        const shortMsg = (err.shortMessage ?? '').toLowerCase();
        const combined = `${msg} ${shortMsg}`;
        return combined.includes('eip-7702') || combined.includes('7702 not supported');
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
    buildCalls,
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
