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

import { useIsTxBatchingSupported } from '../useIsTxBatchingSupported';

interface VaultTransactionAction {
  tx: {
    to: Address;
    data: Hex;
    value?: string;
    chainId: number;
  };
}

interface UseVaultTransactionResult {
  executeTx: () => Promise<void>;
  isBatchSupported: boolean;
  currentActionIndex: number;
  isExecuting: boolean;
}

export function useVaultTransaction(
  actions: VaultTransactionAction[] | null,
  inputAmount: string,
  onTransactionFinished: ({
    txHash,
    amount,
  }: {
    txHash: string | undefined;
    amount: string;
  }) => void,
): UseVaultTransactionResult {
  const wagmiConfig = useConfig();
  const connectedChainId = useChainId();
  const isBatchSupported = useIsTxBatchingSupported(Number(connectedChainId));
  const [currentActionIndex, setCurrentActionIndex] = useState(0);
  const [isExecuting, setIsExecuting] = useState(false);

  const executeTx = useCallback(async () => {
    if (!actions || actions.length === 0) {
      throw new Error('No actions found');
    }

    setIsExecuting(true);
    setCurrentActionIndex(0);

    try {
      // Get the chainId from the first action
      const txChainId = actions[0]?.tx?.chainId;
      if (!txChainId) {
        throw new Error('Invalid action: missing chainId');
      }

      // Utilities
      const ensureCorrectChain = async () => {
        if (connectedChainId !== txChainId) {
          await switchChain(wagmiConfig, { chainId: txChainId });
        }
      };

      const buildCalls = () =>
        actions.map((action) => ({
          to: action.tx.to,
          data: action.tx.data,
          value: action.tx.value ? BigInt(action.tx.value) : undefined,
          chainId: action.tx.chainId,
        }));

      const executeBatch = async () => {
        await ensureCorrectChain();
        const { id: batchId } = await sendCalls(wagmiConfig, { calls: buildCalls() });
        const waitForBatchCompletion = async (): Promise<void> => {
          const callsStatus = await getCallsStatus(wagmiConfig, { id: batchId });
          if (callsStatus.status === 'pending') {
            return waitForBatchCompletion();
          }
          if (callsStatus.status === 'failure') {
            // propagate a generic failure to trigger fallback or surfacing
            throw new Error('Batch calls failed');
          }
        };
        await waitForBatchCompletion();
        onTransactionFinished({ txHash: undefined, amount: inputAmount });
      };

      const executeSequential = async () => {
        await ensureCorrectChain();
        let lastTxHash: string | undefined;
        const runInSequence = actions.reduce<Promise<void>>(async (prev, action, index) => {
          await prev;
          setCurrentActionIndex(index);
          const tx = action?.tx;
          if (!tx) throw new Error(`No transaction found for step ${index}`);
          const hash = await sendTransaction(wagmiConfig, {
            to: tx.to,
            data: tx.data,
            chainId: tx.chainId,
            value: tx.value ? BigInt(tx.value) : undefined,
          });
          await waitForTransactionReceipt(wagmiConfig, { hash });
          lastTxHash = hash;
        }, Promise.resolve());
        await runInSequence;
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
    actions,
    connectedChainId,
    isBatchSupported,
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
