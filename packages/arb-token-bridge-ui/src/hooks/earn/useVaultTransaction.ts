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

      // Switch chain if needed
      if (connectedChainId !== txChainId) {
        await switchChain(wagmiConfig, { chainId: txChainId });
      }

      if (isBatchSupported) {
        // Execute batch transaction
        const { id: batchId } = await sendCalls(wagmiConfig, {
          calls: actions.map((action) => ({
            to: action.tx.to,
            data: action.tx.data,
            value: action.tx.value ? BigInt(action.tx.value) : undefined,
            chainId: action.tx.chainId,
          })),
        });

        // Wait for batch completion
        const waitForBatchCompletion = async () => {
          let callsStatus = await getCallsStatus(wagmiConfig, { id: batchId });
          while (callsStatus.status === 'pending') {
            // eslint-disable-next-line no-await-in-loop
            await new Promise((resolve) => setTimeout(resolve, 300));
            // eslint-disable-next-line no-await-in-loop
            callsStatus = await getCallsStatus(wagmiConfig, { id: batchId });
          }
        };
        await waitForBatchCompletion();

        onTransactionFinished({ txHash: undefined, amount: inputAmount });
      } else {
        // Execute sequential transactions
        let lastTxHash: string | undefined;

        const executeSequential = async () => {
          for (let i = 0; i < actions.length; i++) {
            setCurrentActionIndex(i);
            const tx = actions[i]?.tx;
            if (!tx) throw new Error(`No transaction found for step ${i}`);

            // eslint-disable-next-line no-await-in-loop
            const hash = await sendTransaction(wagmiConfig, {
              to: tx.to,
              data: tx.data,
              chainId: tx.chainId,
              value: tx.value ? BigInt(tx.value) : undefined,
            });

            // eslint-disable-next-line no-await-in-loop
            await waitForTransactionReceipt(wagmiConfig, { hash });
            lastTxHash = hash;
          }
        };

        await executeSequential();
        onTransactionFinished({ txHash: lastTxHash, amount: inputAmount });
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
