import { assertOk, getAPIBaseUrl } from '.';
import { hasBridgeHistory } from './txHistory/sources';

export const fetchLatestIndexedBlockNumber = async (chainId: number): Promise<number> => {
  // the route answers 0 for these anyway; batched callers ask once per batch
  if (!hasBridgeHistory(chainId)) {
    return 0;
  }

  const response = await fetch(`${getAPIBaseUrl()}/api/chains/${chainId}/block-number`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  // the route reports "no backend serves this chain" as 0 with a 200, so a non-2xx
  // is a real failure and must not be flattened into the same 0
  await assertOk(response, `[fetchLatestIndexedBlockNumber] /api/chains/${chainId}/block-number`);

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
