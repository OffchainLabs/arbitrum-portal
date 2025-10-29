import { getChainId } from '@vaultsfyi/common';
import { type Address, type Hex, UserRejectedRequestError } from 'viem';
import { useConfig } from 'wagmi';
import {
  getCallsStatus,
  sendCalls,
  sendTransaction,
  switchChain,
  waitForTransactionReceipt,
} from 'wagmi/actions';

import { queryClient } from '@/config/query/queryClient';
import { useAccountContext } from '@/context/account';
import { type Actions, actionsQueryKey } from '@/queries/actions.query';
import { claimRewardsQueryKey } from '@/queries/claimRewards.query';
import { positionsQueryKey } from '@/queries/positions.query';
import { rewardsQueryKey } from '@/queries/rewards.query';
import { transactionsContextQueryKey } from '@/queries/transactionsContext.query';
import { walletBalancesQueryKey } from '@/queries/walletBalances.query';

import { ChainId } from '../../types/ChainId';
import { useIsTxBatchingSupported } from '../useIsTxBatchingSupported';

export function useVaultTransaction(
  chainId: ChainId,
  actions: VaultTransactionAction[],
  inputAmount: string,
  setTransactionFinished: ({ txHash }: { txHash: string | undefined; amount: string }) => void,
) {
  const wagmiConfig = useConfig();
  const { chainId: connectedChainId } = useAccountContext();
  const { isBatchSupported } = useIsTxBatchingSupported(chainId);

  const currentActionIndex = actionsData?.currentActionIndex ?? 0;

  async function executeTx() {
    try {
      if (!actionsData) {
        throw new Error('No actions found');
      }

      if (connectedChainId !== txChainId) {
        await switchChain(wagmiConfig, { chainId: txChainId });
      }

      const { actions } = actionsData;
      if (isBatchSupported) {
        const { id: batchId } = await sendCalls(wagmiConfig, {
          calls: actions.map((action) => ({
            to: action.tx.to as Address,
            data: action.tx.data as Hex | undefined,
            value: action.tx.value ? BigInt(action.tx.value) : undefined,
            chainId: action.tx.chainId,
          })),
        });
        let callsStatus = await getCallsStatus(wagmiConfig, { id: batchId });
        while (callsStatus.status === 'pending') {
          await new Promise((resolve) => setTimeout(resolve, 300));
          callsStatus = await getCallsStatus(wagmiConfig, { id: batchId });
        }
        setTransactionFinished({ txHash: undefined, amount: inputAmount });
      } else {
        let lastTxHash: string | undefined;
        for (let i = currentActionIndex; i < actions.length; i++) {
          const tx = actions[i].tx;
          if (!tx) throw new Error(`No transaction found for step ${i}`);

          const hash = await sendTransaction(wagmiConfig, {
            to: tx.to as Address,
            data: tx.data as Hex,
            chainId: tx.chainId,
            value: tx.value ? BigInt(tx.value) : undefined,
          });
          await waitForTransactionReceipt(wagmiConfig, { hash });
          lastTxHash = hash;
        }
        setTransactionFinished({ txHash: lastTxHash, amount: inputAmount });
      }
      await queryClient.invalidateQueries({ queryKey: transactionsContextQueryKey });
      await queryClient.invalidateQueries({ queryKey: actionsQueryKey });
      await queryClient.invalidateQueries({ queryKey: walletBalancesQueryKey });
      await queryClient.invalidateQueries({ queryKey: positionsQueryKey });
      await queryClient.invalidateQueries({ queryKey: rewardsQueryKey });
      await queryClient.invalidateQueries({ queryKey: claimRewardsQueryKey });
    } catch (error) {
      if (
        error instanceof UserRejectedRequestError ||
        (error as { shortMessage?: string })?.shortMessage === 'User rejected the request.'
      ) {
        return;
      }
      throw error;
    }
  }

  return { isBatchSupported, currentActionIndex, executeTx };
}
