import { ChildTransactionReceipt } from '@arbitrum/sdk';
import { WithdrawalInitiatedEvent } from '@arbitrum/sdk/dist/lib/abi/L2ArbitrumGateway';
import { L2ArbitrumGateway__factory } from '@arbitrum/sdk/dist/lib/abi/factories/L2ArbitrumGateway__factory';
import { TransactionReceipt } from '@ethersproject/providers';
import pLimit from 'p-limit';

import { getProviderForChainId } from '@/token-bridge-sdk/utils';

import { WithdrawalInitiated } from '../../hooks/arbTokenBridge.types';
import { fetchLifiTransactionHistory } from '../../hooks/useLifiTransactionHistory';
import { fetchOftTransactionHistory } from '../../hooks/useOftTransactionHistory';
import type { Transfer, Withdrawal } from '../../hooks/useTransactionHistory';
import { MergedTransaction } from '../../state/app/state';
import { parseSWRResponse } from '../../state/cctpState';
import { ChainId } from '../../types/ChainId';
import { fetchCCTPDeposits, fetchCCTPWithdrawals } from '../cctp/fetchCCTP';
import { fetchDeposits } from '../deposits/fetchDeposits';
import { ChainPair } from '../txHistoryRoutes';
import { EthWithdrawal } from '../withdrawals/helpers';

export function isValidTxHash(txHash: string | undefined): txHash is string {
  if (!txHash) {
    return false;
  }
  return /^0x[0-9a-fA-F]{64}$/.test(txHash);
}

/**
 * Builds withdrawals directly from a child-chain transaction receipt, without
 * scanning any block ranges. Token withdrawals come from the receipt's
 * `WithdrawalInitiated` gateway events, ETH withdrawals from the remaining
 * ArbSys child-to-parent events.
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
    .map((log) => {
      const { l1Token, _from, _to, _l2ToL1Id, _exitNum, _amount } = gatewayInterface.parseLog(log)
        .args as unknown as WithdrawalInitiatedEvent['args'];
      const matchingEvent = childToParentEvents.find(
        (event) => 'position' in event && event.position.eq(_l2ToL1Id),
      );
      return {
        l1Token,
        _from,
        _to,
        _l2ToL1Id,
        _exitNum,
        _amount,
        txHash: receipt.transactionHash,
        timestamp: matchingEvent?.timestamp,
        direction: 'withdrawal',
        source: 'event_logs',
        parentChainId,
        childChainId,
      };
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
}): Promise<{ chainId: number; receipt: TransactionReceipt } | null> {
  try {
    const receipt = await getProviderForChainId(chainId).getTransactionReceipt(txHash);
    if (!receipt || receipt.status !== 1) {
      return null;
    }
    return { chainId, receipt };
  } catch {
    return null;
  }
}

function matchesTxHash(tx: MergedTransaction, txHash: string) {
  return tx.txId?.toLowerCase() === txHash.toLowerCase();
}

/**
 * CCTP, OFT and LiFi are fetched by wallet-scoped API calls, so query them
 * with the sender recovered from the receipt and keep only the transfer
 * initiated by the searched hash.
 */
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

  const emptyCctpResponse = { pending: [], completed: [] };
  const [cctpDeposits, cctpWithdrawals, oftTransfers, lifiTransfers] = await Promise.all([
    fetchCCTPDeposits(cctpParams)
      .then((response) => parseSWRResponse(response, cctpParams.l1ChainId))
      .catch(() => emptyCctpResponse),
    fetchCCTPWithdrawals(cctpParams)
      .then((response) => parseSWRResponse(response, cctpParams.l1ChainId))
      .catch(() => emptyCctpResponse),
    fetchOftTransactionHistory({ walletAddress: sender, isTestnet: isTestnetMode, txHash }).catch(
      () => [],
    ),
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
  ].filter((tx) => matchesTxHash(tx, txHash));
}

/**
 * Finds bridge transfers for a transaction hash by probing the receipt on each
 * candidate chain, then resolving it as a canonical withdrawal (from the
 * receipt's own events), a canonical deposit (via the hash-filtered
 * subgraph/indexer query), or a CCTP/OFT/LiFi transfer (via their wallet APIs,
 * filtered locally to the hash). This avoids the from-genesis event-log scans
 * used by the full history fetch. The hash must be the transaction that
 * initiated the transfer on the source chain; destination chain hashes are not
 * searched.
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
  const receipts = (
    await Promise.all(
      probeChainIds.map((chainId) => limit(() => getReceiptForChain({ txHash, chainId }))),
    )
  ).filter((result): result is { chainId: number; receipt: TransactionReceipt } => result !== null);

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

  const uniqueSenders = [...new Set(receipts.map(({ receipt }) => receipt.from.toLowerCase()))];
  const apiTransfers = await Promise.all(
    uniqueSenders.map((sender) => fetchApiTransfersForSender({ sender, txHash, isTestnetMode })),
  );

  return [...transfers.flat(), ...apiTransfers.flat()];
}
