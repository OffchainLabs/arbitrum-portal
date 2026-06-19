/**
 * Transient CCTP history backfill (prototype). The subgraph intermittently
 * returns incomplete `messageSent` results — the decentralized-network gateway
 * flaps across indexers at different states. This independently re-reads the
 * recent window from chain logs in the same shape the subgraph returns, so the
 * API route can merge + dedupe and history is deterministic regardless of which
 * indexer answered. Additive and fail-open.
 */
import { Hex, getAddress, hexToBigInt, hexToNumber, keccak256, parseAbiItem, slice } from 'viem';

import { createServerSidePublicClient } from '@/earn-api/lib/serverPublicClient';

import {
  ChainDomain,
  CompletedCCTPTransfer,
  MessageSent,
  PendingCCTPTransfer,
} from '../../app/api/cctp/[type]';
import { ChainId } from '../../types/ChainId';
import { Address } from '../AddressUtils';
import { logger } from '../logger';

type CctpTransfers = {
  pending: PendingCCTPTransfer[];
  completed: CompletedCCTPTransfer[];
};

type CctpBackfillMeta = {
  enabled: boolean;
  addedPending?: number;
  addedCompleted?: number;
  error?: string;
};

const MESSAGE_SENT_EVENT = parseAbiItem('event MessageSent(bytes message)');
const MESSAGE_RECEIVED_EVENT = parseAbiItem(
  'event MessageReceived(address indexed caller, uint32 sourceDomain, uint64 indexed nonce, bytes32 sender, bytes messageBody)',
);

/** V1 MessageTransmitter — emits MessageSent on the source chain, MessageReceived on the destination. */
const MESSAGE_TRANSMITTER: Partial<Record<ChainId, Address>> = {
  [ChainId.Ethereum]: '0x0a992d191deec32afe36203ad87d7d289a738f81',
  [ChainId.ArbitrumOne]: '0xc30362313fbba5cf9163f0bb16a0e01f01a896ca',
};

/**
 * How far back to re-read from head on every request. Must cover the worst-case
 * indexer lag (a stale indexer can sit ~1 week behind); widen if that grows.
 */
const RECENT_WINDOW_BLOCKS: Partial<Record<ChainId, number>> = {
  [ChainId.Ethereum]: 60_000, // ~8 days
  [ChainId.ArbitrumOne]: 2_600_000, // ~7.5 days
};

/**
 * The user addresses the subgraph stores as `sender`/`recipient` live in the burn
 * body (messageSender/mintRecipient), not the message header (which holds the
 * TokenMessenger contracts).
 */
function decodeCctpMessage(message: Hex) {
  const addressAt = (wordStart: number) =>
    getAddress(slice(message, wordStart + 12, wordStart + 32));

  const BODY = 116;
  return {
    sourceDomain: hexToNumber(slice(message, 4, 8)),
    destinationDomain: hexToNumber(slice(message, 8, 12)),
    nonce: hexToBigInt(slice(message, 12, 20)).toString(),
    recipient: addressAt(BODY + 36) as Address, // mintRecipient
    amount: hexToBigInt(slice(message, BODY + 68, BODY + 100)).toString(),
    sender: addressAt(BODY + 100) as Address, // messageSender
  };
}

type ServerClient = ReturnType<typeof createServerSidePublicClient>;

async function fetchBlockTimestamps(
  client: ServerClient,
  blockNumbers: bigint[],
): Promise<Map<string, number>> {
  const unique = Array.from(new Set(blockNumbers.map((b) => b.toString())));
  const entries = await Promise.all(
    unique.map(async (bn) => {
      const block = await client.getBlock({ blockNumber: BigInt(bn) });
      return [bn, Number(block.timestamp)] as const;
    }),
  );
  return new Map(entries);
}

type BackfillParams = {
  type: 'deposits' | 'withdrawals';
  walletAddress: Address;
  sourceChainId: ChainId;
  targetChainId: ChainId;
};

async function fetchCctpGapBackfill({
  type,
  walletAddress,
  sourceChainId,
  targetChainId,
}: BackfillParams): Promise<CctpTransfers> {
  const sourceTransmitter = MESSAGE_TRANSMITTER[sourceChainId];
  const targetTransmitter = MESSAGE_TRANSMITTER[targetChainId];
  const recentWindowBlocks = RECENT_WINDOW_BLOCKS[sourceChainId];
  if (!sourceTransmitter || !targetTransmitter || !recentWindowBlocks) {
    return { pending: [], completed: [] };
  }

  const sourceClient = createServerSidePublicClient(sourceChainId);
  const targetClient = createServerSidePublicClient(targetChainId);
  const wallet = walletAddress.toLowerCase();
  const expectedDestinationDomain =
    type === 'withdrawals' ? ChainDomain.Ethereum : ChainDomain.ArbitrumOne;

  const sourceHead = Number(await sourceClient.getBlockNumber());
  const scanFrom = Math.max(0, sourceHead - recentWindowBlocks);

  // MessageSent has no indexed user topic, so fetch all in the gap and filter here.
  const sentLogs = await sourceClient.getLogs({
    address: sourceTransmitter,
    event: MESSAGE_SENT_EVENT,
    fromBlock: BigInt(scanFrom),
    toBlock: BigInt(sourceHead),
  });

  const sent = sentLogs.flatMap((log) => {
    const message = log.args.message;
    if (!message) return [];
    let decoded: ReturnType<typeof decodeCctpMessage>;
    try {
      decoded = decodeCctpMessage(message);
    } catch {
      return [];
    }
    if (decoded.destinationDomain !== expectedDestinationDomain) return [];
    if (decoded.sender.toLowerCase() !== wallet && decoded.recipient.toLowerCase() !== wallet) {
      return [];
    }
    return [{ log, message, decoded }];
  });

  if (sent.length === 0) return { pending: [], completed: [] };

  // Filter the (high-volume) MessageReceived query by the indexed nonces we found,
  // so the response stays small enough for a wide block range. `nonce` is unique
  // only per source domain, so we still key the map by sourceDomain + nonce.
  const targetHead = Number(await targetClient.getBlockNumber());
  const targetWindow = RECENT_WINDOW_BLOCKS[targetChainId] ?? recentWindowBlocks;
  const sentNonces = Array.from(new Set(sent.map((s) => BigInt(s.decoded.nonce))));
  const recvLogs = await targetClient.getLogs({
    address: targetTransmitter,
    event: MESSAGE_RECEIVED_EVENT,
    args: { nonce: sentNonces },
    fromBlock: BigInt(Math.max(0, targetHead - targetWindow)),
    toBlock: BigInt(targetHead),
  });
  const received = new Map<string, { transactionHash: Address; blockNumber: bigint }>();
  for (const log of recvLogs) {
    if (typeof log.args.sourceDomain === 'undefined' || typeof log.args.nonce === 'undefined') {
      continue;
    }
    received.set(`${log.args.sourceDomain}-${log.args.nonce}`, {
      transactionHash: log.transactionHash as Address,
      blockNumber: log.blockNumber,
    });
  }

  const sourceTimestamps = await fetchBlockTimestamps(
    sourceClient,
    sent.map((s) => s.log.blockNumber),
  );
  const matchedTargetBlocks = sent
    .map((s) => received.get(`${s.decoded.sourceDomain}-${s.decoded.nonce}`)?.blockNumber)
    .filter((bn): bn is bigint => typeof bn === 'bigint');
  const targetTimestamps = await fetchBlockTimestamps(targetClient, matchedTargetBlocks);

  const pending: PendingCCTPTransfer[] = [];
  const completed: CompletedCCTPTransfer[] = [];

  for (const { log, message, decoded } of sent) {
    const attestationHash = keccak256(message);
    const messageSent: MessageSent = {
      attestationHash,
      blockNumber: log.blockNumber.toString(),
      blockTimestamp: String(sourceTimestamps.get(log.blockNumber.toString()) ?? 0),
      id: attestationHash,
      message,
      nonce: decoded.nonce,
      sender: decoded.sender,
      recipient: decoded.recipient,
      sourceDomain: String(decoded.sourceDomain) as `${ChainDomain}`,
      transactionHash: log.transactionHash as Address,
      amount: decoded.amount,
    };

    const match = received.get(`${decoded.sourceDomain}-${decoded.nonce}`);
    if (match) {
      completed.push({
        messageSent,
        messageReceived: {
          blockNumber: match.blockNumber.toString(),
          blockTimestamp: String(targetTimestamps.get(match.blockNumber.toString()) ?? 0),
          caller: walletAddress,
          id: messageSent.id,
          messageBody: '0x',
          nonce: decoded.nonce,
          sender: decoded.sender,
          sourceDomain: messageSent.sourceDomain,
          transactionHash: match.transactionHash,
        },
      });
    } else {
      pending.push({ messageSent });
    }
  }

  return { pending, completed };
}

/**
 * Merge subgraph CCTP results with the chain-log backfill, deduped by tx hash
 * (subgraph wins). Enable-gated and fail-open: any backfill error returns the
 * subgraph results untouched.
 */
export async function mergeCctpBackfill({
  type,
  walletAddress,
  l1ChainId,
  l2ChainId,
  subgraph,
}: {
  type: 'deposits' | 'withdrawals';
  walletAddress: Address;
  l1ChainId: ChainId;
  l2ChainId: ChainId;
  subgraph: CctpTransfers;
}): Promise<CctpTransfers & { meta: CctpBackfillMeta }> {
  if (process.env.CCTP_GAP_BACKFILL_ENABLED === 'false') {
    return { ...subgraph, meta: { enabled: false } };
  }

  try {
    const backfill = await fetchCctpGapBackfill({
      type,
      walletAddress,
      sourceChainId: type === 'deposits' ? l1ChainId : l2ChainId,
      targetChainId: type === 'deposits' ? l2ChainId : l1ChainId,
    });

    const seen = new Set(
      [...subgraph.pending, ...subgraph.completed].map((t) =>
        t.messageSent.transactionHash.toLowerCase(),
      ),
    );
    const isNew = (t: PendingCCTPTransfer) =>
      !seen.has(t.messageSent.transactionHash.toLowerCase());
    const addedPending = backfill.pending.filter(isNew);
    const addedCompleted = backfill.completed.filter(isNew);

    return {
      pending: [...subgraph.pending, ...addedPending],
      completed: [...subgraph.completed, ...addedCompleted],
      meta: {
        enabled: true,
        addedPending: addedPending.length,
        addedCompleted: addedCompleted.length,
      },
    };
  } catch (error) {
    logger.warn(`[cctp] gap backfill failed, returning subgraph-only data: ${error}`);
    return { ...subgraph, meta: { enabled: true, error: String(error) } };
  }
}
