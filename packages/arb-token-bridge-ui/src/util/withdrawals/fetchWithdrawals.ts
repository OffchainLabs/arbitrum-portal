import { getArbitrumNetwork } from '@arbitrum/sdk';
import { Provider } from '@ethersproject/providers';
import { constants } from 'ethers';

import { WithdrawalInitiated } from '../../hooks/arbTokenBridge.types';
import { Withdrawal } from '../../hooks/useTransactionHistory';
import { getNonce } from '../AddressUtils';
import { backOff, wait } from '../ExponentialBackoffUtils';
import { fetchLatestIndexedBlockNumber } from '../SubgraphUtils';
import { fetchL2Gateways } from '../fetchL2Gateways';
import { logger } from '../logger';
import { isAlchemyChain, isNetwork } from '../networks';
import { fetchETHWithdrawalsFromEventLogs } from './fetchETHWithdrawalsFromEventLogs';
import {
  Query,
  fetchTokenWithdrawalsFromEventLogsSequentially,
} from './fetchTokenWithdrawalsFromEventLogsSequentially';
import { fetchWithdrawalsFromSubgraph } from './fetchWithdrawalsFromSubgraph';
import { attachTimestampToTokenWithdrawal } from './helpers';

async function getGateways(provider: Provider): Promise<{
  standardGateway: string;
  wethGateway: string;
  customGateway: string;
  otherGateways: string[];
}> {
  const network = await getArbitrumNetwork(provider);

  const standardGateway = network.tokenBridge?.childErc20Gateway;
  const customGateway = network.tokenBridge?.childCustomGateway;
  const wethGateway = network.tokenBridge?.childWethGateway;
  const otherGateways = await fetchL2Gateways(provider);

  return {
    standardGateway: standardGateway ?? constants.AddressZero,
    wethGateway: wethGateway ?? constants.AddressZero,
    customGateway: customGateway ?? constants.AddressZero,
    otherGateways,
  };
}

export type FetchWithdrawalsParams = {
  sender?: string;
  receiver?: string;
  fromBlock?: number;
  toBlock?: number;
  parentChainId: number;
  l2Provider: Provider;
  pageNumber?: number;
  pageSize?: number;
  searchString?: string;
  forceFetchReceived?: boolean;
};

type FetchWithdrawalsUsingEventLogsParams = {
  sender?: string;
  receiver?: string;
  fromBlock: number;
  toBlock?: number;
  parentChainId: number;
  l2ChainId: number;
  l2Provider: Provider;
  forceFetchReceived?: boolean;
};

async function fetchWithdrawalsUsingEventLogs({
  sender,
  receiver,
  fromBlock,
  toBlock,
  parentChainId,
  l2ChainId,
  l2Provider,
  forceFetchReceived = false,
}: FetchWithdrawalsUsingEventLogsParams): Promise<Withdrawal[]> {
  if (typeof toBlock === 'number' && fromBlock >= toBlock) {
    return [];
  }

  const { isOrbitChain, isCoreChain } = isNetwork(l2ChainId);

  const gateways = await getGateways(l2Provider);
  const senderNonce = await backOff(() => getNonce(sender, { provider: l2Provider }));

  const queries: Query[] = [];

  // alchemy as a raas has a global rate limit across their chains, so we have to fetch sequentially and wait in-between requests to work around this
  const isAlchemy = isAlchemyChain(l2ChainId);
  const delayMs = isAlchemy ? 2_000 : 0;

  const allGateways = [
    gateways.standardGateway,
    gateways.wethGateway,
    gateways.customGateway,
    ...gateways.otherGateways,
  ];

  // sender queries; only add if nonce > 0
  if (senderNonce > 0) {
    if (isAlchemy) {
      // for alchemy, fetch sequentially
      queries.push({ sender, gateways: [gateways.standardGateway] });
      queries.push({ sender, gateways: [gateways.wethGateway] });
      queries.push({ sender, gateways: [gateways.customGateway] });
      queries.push({ sender, gateways: gateways.otherGateways });
    } else {
      // for other chains, fetch in parallel
      queries.push({ sender, gateways: allGateways });
    }
  }

  const fetchReceivedTransactions =
    // check if we already fetched for each block
    toBlock && fromBlock >= toBlock
      ? false
      : // receiver queries; only add if nonce > 0 for orbit chains
        isCoreChain || (isOrbitChain && senderNonce > 0) || forceFetchReceived;

  if (fetchReceivedTransactions) {
    if (isAlchemy) {
      // for alchemy, fetch sequentially
      queries.push({ receiver, gateways: [gateways.standardGateway] });
      queries.push({ receiver, gateways: [gateways.wethGateway] });
      queries.push({ receiver, gateways: [gateways.customGateway] });
      queries.push({ receiver, gateways: gateways.otherGateways });
    } else {
      // for other chains, fetch in parallel
      queries.push({ receiver, gateways: allGateways });
    }
  }

  const ethWithdrawalsFromEventLogs = fetchReceivedTransactions
    ? await backOff(() =>
        fetchETHWithdrawalsFromEventLogs({
          receiver,
          fromBlock: fromBlock + 1,
          toBlock: toBlock ?? 'latest',
          l2Provider,
        }),
      )
    : [];

  await wait(delayMs);

  const tokenWithdrawalsFromEventLogs = await fetchTokenWithdrawalsFromEventLogsSequentially({
    sender,
    receiver,
    fromBlock: fromBlock + 1,
    toBlock: toBlock ?? 'latest',
    provider: l2Provider,
    queries,
  });

  const mappedEthWithdrawalsFromEventLogs: Withdrawal[] = ethWithdrawalsFromEventLogs.map((tx) => {
    return {
      ...tx,
      direction: 'withdrawal',
      source: 'event_logs',
      parentChainId,
      childChainId: l2ChainId,
    };
  });

  const mappedTokenWithdrawalsFromEventLogs: WithdrawalInitiated[] =
    tokenWithdrawalsFromEventLogs.map((tx) => {
      return {
        ...tx,
        direction: 'withdrawal',
        source: 'event_logs',
        parentChainId,
        childChainId: l2ChainId,
      };
    });

  // we need timestamps to sort token withdrawals along ETH withdrawals
  const tokenWithdrawalsFromEventLogsWithTimestamp: Withdrawal[] = await Promise.all(
    mappedTokenWithdrawalsFromEventLogs.map((withdrawal) =>
      attachTimestampToTokenWithdrawal({ withdrawal, l2Provider }),
    ),
  );

  return [...mappedEthWithdrawalsFromEventLogs, ...tokenWithdrawalsFromEventLogsWithTimestamp];
}

export async function fetchWithdrawals({
  sender,
  receiver,
  parentChainId,
  l2Provider,
  pageNumber = 0,
  pageSize = 10,
  searchString,
  fromBlock,
  toBlock,
  forceFetchReceived = false,
}: FetchWithdrawalsParams): Promise<Withdrawal[]> {
  if (typeof sender === 'undefined' && typeof receiver === 'undefined') {
    return [];
  }

  const l2ChainID = (await l2Provider.getNetwork()).chainId;

  if (!fromBlock) {
    fromBlock = 0;
  }

  const head = typeof toBlock === 'number' ? toBlock : await l2Provider.getBlockNumber();

  let lastIndexedBlock = 0;
  try {
    lastIndexedBlock = await fetchLatestIndexedBlockNumber(l2ChainID);
  } catch (error) {
    logger.info('Error fetching latest indexed block number', error);
  }

  const indexedBoundary = lastIndexedBlock > 0 ? Math.min(lastIndexedBlock, head) : fromBlock;

  let eventLogsFromBlock = indexedBoundary;

  let indexedWithdrawals: Withdrawal[] = [];
  try {
    indexedWithdrawals = (
      await fetchWithdrawalsFromSubgraph({
        sender,
        receiver,
        fromBlock,
        toBlock: indexedBoundary,
        l2ChainId: l2ChainID,
        pageNumber,
        pageSize,
        searchString,
      })
    ).map((tx) => ({
      ...tx,
      direction: 'withdrawal' as const,
      source: 'subgraph' as const,
      parentChainId,
      childChainId: l2ChainID,
    }));
  } catch (error) {
    logger.info('Error fetching withdrawals from indexed source', error);
    eventLogsFromBlock = fromBlock;
  }

  const eventLogWithdrawals = await fetchWithdrawalsUsingEventLogs({
    sender,
    receiver,
    fromBlock: eventLogsFromBlock,
    toBlock,
    parentChainId,
    l2ChainId: l2ChainID,
    l2Provider,
    forceFetchReceived,
  });

  return [...eventLogWithdrawals, ...indexedWithdrawals];
}
