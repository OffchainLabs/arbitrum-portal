import { useCallback, useState } from 'react';
import { type Address, type Hex, UserRejectedRequestError } from 'viem';
import { useChainId, useConfig } from 'wagmi';
import {
  getCallsStatus,
  sendCalls,
  sendTransaction,
  switchChain,
  waitForTransactionReceipt,
} from 'wagmi/actions';

import { useIsTxBatchingSupported } from '@/app-hooks/useIsTxBatchingSupported';

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

/**
 * Shared hook for executing Earn transactions with batch/sequential support
 * Handles chain switching, EIP-7702 fallback, and user rejection
 */
export function useEarnTransactionExecution({
  chainId,
  buildCalls,
  onTransactionSubmitted,
  onTransactionFinished,
  inputAmount,
}: EarnTransactionExecutionOptions): UseEarnTransactionExecutionResult {
  const wagmiConfig = useConfig();
  const connectedChainId = useChainId();
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

        const waitForBatchCompletion = async (): Promise<string> => {
          const callsStatus = await getCallsStatus(wagmiConfig, { id: batchId });
          if (callsStatus.status === 'pending') {
            // Wait 1 second before polling again to avoid excessive API calls
            await new Promise((resolve) => setTimeout(resolve, 1000));
            return waitForBatchCompletion();
          }
          if (callsStatus.status === 'failure') {
            throw new Error('Batch calls failed');
          }
          // Get transaction hash from receipts array
          // For batched transactions, receipts contains the bundled transaction receipt(s)
          // The receipt should have a 'hash' property (standard viem transaction receipt property)
          const receipt = callsStatus.receipts?.[0];
          if (!receipt) {
            throw new Error('Batch completed but no receipt found');
          }
          // Access hash property (standard in viem TransactionReceipt)
          // Type assertion needed as WalletCallReceipt type may not expose hash directly
          const txHash = receipt.transactionHash;
          if (!txHash) {
            throw new Error('Batch completed but transaction hash not found in receipt');
          }
          return txHash;
        };

        const batchTxHash = await waitForBatchCompletion();
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

          // TypeScript: call is guaranteed to be defined after the check above
          const currentCall = call;

          // eslint-disable-next-line no-await-in-loop
          const hash = await sendTransaction(wagmiConfig, {
            to: currentCall.to,
            data: currentCall.data,
            chainId: currentCall.chainId,
            value: currentCall.value,
          });

          // Always update lastTxHash with the current transaction hash
          lastTxHash = hash;

          // Call onTransactionSubmitted only for the last transaction
          if (onTransactionSubmitted && index === calls.length - 1) {
            onTransactionSubmitted({ txHash: hash, amount: inputAmount });
          }

          // eslint-disable-next-line no-await-in-loop
          await waitForTransactionReceipt(wagmiConfig, { hash });
        }

        // Ensure we always pass the hash (should be set if we got here)
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
      if (
        error instanceof UserRejectedRequestError ||
        (error as { shortMessage?: string })?.shortMessage === 'User rejected the request.'
      ) {
        // User rejected, silently ignore
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
