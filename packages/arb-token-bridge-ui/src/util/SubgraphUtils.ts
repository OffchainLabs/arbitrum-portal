import { getAPIBaseUrl } from '.';
import { ChainId } from '../types/ChainId';

/**
 * Whether this child chain's bridge history comes from a subgraph rather than the
 * indexer. Nova is the only one left, and its parent and child subgraphs are
 * deployed together, so one predicate covers both directions.
 */
export function hasBridgeSubgraph(childChainId: number) {
  return childChainId === ChainId.ArbitrumNova;
}

export const fetchLatestIndexedBlockNumber = async (chainId: number): Promise<number> => {
  const response = await fetch(`${getAPIBaseUrl()}/api/chains/${chainId}/block-number`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    return 0;
  }

  const blockNumber = ((await response.json()) as { data?: number }).data;
  return Number.isFinite(blockNumber) ? (blockNumber as number) : 0;
};

export const shouldIncludeSentTxs = ({
  type,
  isSmartContractWallet,
  isConnectedToParentChain,
}: {
  type: 'deposits' | 'withdrawals';
  isSmartContractWallet: boolean;
  isConnectedToParentChain: boolean;
}) => {
  if (isSmartContractWallet) {
    // show txs sent from this account for:
    // 1. deposits if we are connected to the parent chain, or
    // 2. withdrawals if we are connected to the child chain
    return isConnectedToParentChain ? type === 'deposits' : type === 'withdrawals';
  }
  // always show for EOA
  return true;
};

export const shouldIncludeReceivedTxs = ({
  type,
  isSmartContractWallet,
  isConnectedToParentChain,
}: {
  type: 'deposits' | 'withdrawals';
  isSmartContractWallet: boolean;
  isConnectedToParentChain: boolean;
}) => {
  if (isSmartContractWallet) {
    // show txs sent to this account for:
    // 1. withdrawals if we are connected to the parent chain, or
    // 2. deposits if we are connected to the child chain
    return isConnectedToParentChain ? type === 'withdrawals' : type === 'deposits';
  }
  // always show for EOA
  return true;
};
