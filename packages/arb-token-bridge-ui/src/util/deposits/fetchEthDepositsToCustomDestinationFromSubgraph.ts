import { fetchBridgeHistory } from '../txHistory/fetchBridgeHistory';
import { hasBridgeHistory } from '../txHistory/sources';

export type FetchEthDepositsToCustomDestinationFromSubgraphResult = {
  receiver: string;
  sender: string;
  timestamp: string;
  transactionHash: string;
  type: 'EthDeposit';
  isClassic: false;
  id: string;
  ethValue: string;
  blockCreatedAt: string;
};

/**
 * Fetches initiated retryable deposits (ETH transfers to custom destination) from subgraph in range of [fromBlock, toBlock] and pageParams.
 *
 * @param query Query params
 * @param query.sender Address that initiated the deposit
 * @param query.receiver Address that received the funds
 * @param query.fromBlock Start at this block number (including)
 * @param query.toBlock Stop at this block number (including)
 * @param query.l2ChainId Chain id for the L2 network
 * @param query.pageSize Fetch these many records from subgraph
 * @param query.pageNumber Fetch records starting [pageNumber * pageSize] records
 * @param query.searchString Searches records through the l1TxHash
 */

export const fetchEthDepositsToCustomDestinationFromSubgraph = async ({
  sender,
  receiver,
  fromBlock,
  toBlock,
  l2ChainId,
  pageSize = 10,
  pageNumber = 0,
  searchString = '',
}: {
  sender?: string;
  receiver?: string;
  fromBlock: number;
  toBlock?: number;
  l2ChainId: number;
  pageSize?: number;
  pageNumber?: number;
  searchString?: string;
}): Promise<FetchEthDepositsToCustomDestinationFromSubgraphResult[]> => {
  if (!hasBridgeHistory(Number(l2ChainId))) {
    return [];
  }

  if (toBlock && fromBlock >= toBlock) {
    // if fromBlock > toBlock or both are equal / 0
    return [];
  }

  return fetchBridgeHistory<FetchEthDepositsToCustomDestinationFromSubgraphResult>({
    route: 'eth-deposits-custom-destination',
    query: { sender, receiver, fromBlock, toBlock, l2ChainId, pageSize, pageNumber, searchString },
  });
};
