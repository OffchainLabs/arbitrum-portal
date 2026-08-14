import { ChildTransactionReceipt } from '@arbitrum/sdk';
import { WithdrawalInitiatedEvent } from '@arbitrum/sdk/dist/lib/abi/L2ArbitrumGateway';
import { L2ArbitrumGateway__factory } from '@arbitrum/sdk/dist/lib/abi/factories/L2ArbitrumGateway__factory';
import { TransactionReceipt } from '@ethersproject/providers';
import pLimit from 'p-limit';

import { getProviderForChainId } from '@/token-bridge-sdk/utils';

import { WithdrawalInitiated } from '../../hooks/arbTokenBridge.types';
import { fetchLifiTransactionHistory } from '../../hooks/useLifiTransactionHistory';
import { fetchOftTransactionsByTxHash } from '../../hooks/useOftTransactionHistory';
import type { Transfer, Withdrawal } from '../../hooks/useTransactionHistory';
import { MergedTransaction } from '../../state/app/state';
import { parseSWRResponse } from '../../state/cctpState';
import { ChainId } from '../../types/ChainId';
import { fetchCCTPDeposits, fetchCCTPWithdrawals } from '../cctp/fetchCCTP';
import { fetchDeposits } from '../deposits/fetchDeposits';
import { ChainPair } from '../txHistoryRoutes';
import { EthWithdrawal } from '../withdrawals/helpers';

/**
 * Builds withdrawals directly from a child-chain receipt, without scanning any
 * block ranges: token withdrawals from its `WithdrawalInitiated` gateway
 * events, ETH withdrawals from the remaining ArbSys child-to-parent events.
 */
export function getWithdrawalsFromReceipt({
  receipt,
  parentChainId,
  childChainId,
}: {
  receipt: TransactionReceipt;
  parentChainId: number;
  childChainId: number;
}): Withdrawal[] {
  const gatewayInterface = L2ArbitrumGateway__factory.createInterface();
  const withdrawalInitiatedTopic = gatewayInterface.getEventTopic('WithdrawalInitiated');

  const childToParentEvents = new ChildTransactionReceipt(receipt).getChildToParentEvents();

  const tokenWithdrawals: WithdrawalInitiated[] = receipt.logs
    .filter((log) => log.topics[0] === withdrawalInitiatedTopic)
    .flatMap((log) => {
      const { l1Token, _from, _to, _l2ToL1Id, _exitNum, _amount } = gatewayInterface.parseLog(log)
        .args as unknown as WithdrawalInitiatedEvent['args'];
      // a real gateway withdrawal always has its ArbSys event in the same
      // receipt; without it this is a same-signature event from another contract
      const matchingEvent = childToParentEvents.find(
        (event) => 'position' in event && event.position.eq(_l2ToL1Id),
      );
      if (!matchingEvent) {
        return [];
      }
      return [
        {
          l1Token,
          _from,
          _to,
          _l2ToL1Id,
          _exitNum,
          _amount,
          txHash: receipt.transactionHash,
          timestamp: matchingEvent.timestamp,
          direction: 'withdrawal' as const,
          source: 'event_logs' as const,
          parentChainId,
          childChainId,
        },
      ];
    });

  const tokenWithdrawalIds = new Set(tokenWithdrawals.map((tx) => tx._l2ToL1Id.toString()));

  const ethWithdrawals: EthWithdrawal[] = childToParentEvents
    .filter((event) => !('position' in event) || !tokenWithdrawalIds.has(event.position.toString()))
    .map((event) => ({
      ...event,
      transactionHash: receipt.transactionHash,
      direction: 'withdrawal',
      source: 'event_logs',
      parentChainId,
      childChainId,
    }));

  return [...tokenWithdrawals, ...ethWithdrawals];
}

async function getReceiptForChain({
  txHash,
  chainId,
}: {
  txHash: string;
  chainId: number;
}): Promise<{ chainId: number; receipt: TransactionReceipt } | 'failed' | null> {
  try {
    const receipt = await getProviderForChainId(chainId).getTransactionReceipt(txHash);
    if (!receipt || receipt.status !== 1) {
      return null;
    }
    return { chainId, receipt };
  } catch {
    return 'failed';
  }
}

// CCTP, OFT and LiFi expose no canonical events on the receipt, so query their
// APIs with the sender recovered from it and keep only the searched hash.
async function fetchApiTransfersForSender({
  sender,
  txHash,
  isTestnetMode,
}: {
  sender: string;
  txHash: string;
  isTestnetMode: boolean;
}): Promise<MergedTransaction[]> {
  const cctpParams = {
    walletAddress: sender,
    l1ChainId: isTestnetMode ? ChainId.Sepolia : ChainId.Ethereum,
    pageNumber: 0,
    pageSize: 1000,
    connectedToEthereum: false,
    isSmartContractWallet: false,
  };

  const [cctpDeposits, cctpWithdrawals, oftTransfers, lifiTransfers] = await Promise.all([
    fetchCCTPDeposits(cctpParams)
      .then((response) => parseSWRResponse(response, cctpParams.l1ChainId))
      .catch(() => ({ pending: [], completed: [] })),
    fetchCCTPWithdrawals(cctpParams)
      .then((response) => parseSWRResponse(response, cctpParams.l1ChainId))
      .catch(() => ({ pending: [], completed: [] })),
    fetchOftTransactionsByTxHash({ txHash, isTestnet: isTestnetMode }).catch(() => []),
    // The LiFi transaction history API only serves mainnet transfers.
    isTestnetMode ? Promise.resolve([]) : fetchLifiTransactionHistory(sender).catch(() => []),
  ]);

  return [
    ...cctpDeposits.pending,
    ...cctpDeposits.completed,
    ...cctpWithdrawals.pending,
    ...cctpWithdrawals.completed,
    ...oftTransfers,
    ...lifiTransfers,
  ].filter((tx) => tx.txId?.toLowerCase() === txHash.toLowerCase());
}

/**
 * Finds bridge transfers for a source chain (initiating) tx hash by probing
 * the receipt on each candidate chain, then resolving it as a canonical
 * withdrawal/deposit or a CCTP/OFT/LiFi transfer. No event-log block scanning
 * is involved, unlike the full address history fetch.
 */
export async function fetchTransactionsByTxHash({
  txHash,
  chainPairs,
  probeChainIds,
  isTestnetMode,
}: {
  txHash: string;
  /** Canonical bridge chain pairs to resolve deposits/withdrawals against. */
  chainPairs: ChainPair[];
  /** All chains to look the receipt up on (canonical + CCTP/OFT/LiFi routes). */
  probeChainIds: number[];
  isTestnetMode: boolean;
}): Promise<Transfer[]> {
  const limit = pLimit(10);
  const probeResults = await Promise.all(
    probeChainIds.map((chainId) => limit(() => getReceiptForChain({ txHash, chainId }))),
  );

  const receipts = probeResults.filter(
    (result): result is { chainId: number; receipt: TransactionReceipt } =>
      typeof result === 'object' && result !== null,
  );

  // with no receipt found and a chain unreachable, "not found" could be a lie
  if (receipts.length === 0 && probeResults.includes('failed')) {
    throw new Error('Some chains could not be checked for this transaction hash.');
  }

  const transfers = await Promise.all(
    receipts.map(async ({ chainId, receipt }) => {
      const withdrawals = chainPairs
        .filter((chainPair) => chainPair.childChainId === chainId)
        .flatMap((chainPair) =>
          getWithdrawalsFromReceipt({
            receipt,
            parentChainId: chainPair.parentChainId,
            childChainId: chainPair.childChainId,
          }),
        );

      const depositPairs = chainPairs.filter((chainPair) => chainPair.parentChainId === chainId);
      const deposits = (
        await Promise.all(
          depositPairs.map((chainPair) =>
            fetchDeposits({
              sender: receipt.from,
              l1Provider: getProviderForChainId(chainPair.parentChainId),
              l2Provider: getProviderForChainId(chainPair.childChainId),
              pageNumber: 0,
              pageSize: 100,
              searchString: txHash,
            }),
          ),
        )
      ).flat();

      return [...withdrawals, ...deposits];
    }),
  );

  const canonicalTransfers = transfers.flat();

  // a hash is a single transfer; skip the API lookups once canonical resolved it
  if (canonicalTransfers.length > 0) {
    return canonicalTransfers;
  }

  const uniqueSenders = [...new Set(receipts.map(({ receipt }) => receipt.from.toLowerCase()))];
  const apiTransfers = await Promise.all(
    uniqueSenders.map((sender) => fetchApiTransfersForSender({ sender, txHash, isTestnetMode })),
  );

  return apiTransfers.flat();
}
