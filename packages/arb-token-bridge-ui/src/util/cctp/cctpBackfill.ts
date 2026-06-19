/**
 * Transient CCTP history backfill (prototype). The subgraph intermittently
 * returns incomplete `messageSent` results — the decentralized-network gateway
 * flaps across indexers at different states. This independently re-reads the
 * recent window from chain logs in the same shape the subgraph returns, so the
 * API route can merge + dedupe and history is deterministic regardless of which
 * indexer answered. Additive and fail-open.
 */
import { Hex, getAddress, hexToBigInt, hexToNumber, keccak256, parseAbiItem, slice } from 'viem';

import type {
  ChainDomain,
  CompletedCCTPTransfer,
  MessageSent,
  PendingCCTPTransfer,
} from '../../app/api/cctp/[type]';
import { ChainId } from '../../types/ChainId';
import { Address } from '../AddressUtils';
import { logger } from '../logger';
import { createServerSidePublicClient } from '../rpc/serverPublicClient';

type CctpTransfers = {
  pending: PendingCCTPTransfer[];
  completed: CompletedCCTPTransfer[];
};

export type CctpBackfillMeta = {
  enabled: boolean;
  addedPending?: number;
  addedCompleted?: number;
  upgraded?: number;
  error?: string;
};

// CCTP domain IDs, kept local so this module has no runtime dependency on the
// route's `ChainDomain` enum (which imports back from here → module cycle).
const DOMAIN_ETHEREUM = 0;
const DOMAIN_ARBITRUM_ONE = 3;

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
 * How far back to re-read from head. Must cover the worst-case indexer lag (a
 * stale indexer can sit ~1 week behind); widen if that grows.
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

type DecodedSent = {
  blockNumber: bigint;
  transactionHash: Address;
  message: Hex;
  decoded: ReturnType<typeof decodeCctpMessage>;
};

type ServerClient = ReturnType<typeof createServerSidePublicClient>;

/**
 * The wallet-independent recent `MessageSent` scan is the expensive part (a wide
 * getLogs), so cache it briefly and share it across requests. In-memory and
 * per-instance (e.g. per serverless lambda) — absorbs bursts, not a cross-instance
 * cache.
 */
const RECENT_SENT_TTL_MS = 30_000;
const recentSentCache = new Map<ChainId, { expiresAt: number; value: Promise<DecodedSent[]> }>();

async function fetchRecentSent(
  chainId: ChainId,
  transmitter: Address,
  windowBlocks: number,
): Promise<DecodedSent[]> {
  const client = createServerSidePublicClient(chainId);
  const head = Number(await client.getBlockNumber());
  const expectedDestinationDomain =
    chainId === ChainId.ArbitrumOne ? DOMAIN_ETHEREUM : DOMAIN_ARBITRUM_ONE;

  const logs = await client.getLogs({
    address: transmitter,
    event: MESSAGE_SENT_EVENT,
    fromBlock: BigInt(Math.max(0, head - windowBlocks)),
    toBlock: BigInt(head),
  });

  return logs.flatMap((log) => {
    const message = log.args.message;
    if (!message) return [];
    try {
      const decoded = decodeCctpMessage(message);
      if (decoded.destinationDomain !== expectedDestinationDomain) return [];
      return [
        {
          blockNumber: log.blockNumber,
          transactionHash: log.transactionHash as Address,
          message,
          decoded,
        },
      ];
    } catch {
      return [];
    }
  });
}

function getRecentSent(
  chainId: ChainId,
  transmitter: Address,
  windowBlocks: number,
): Promise<DecodedSent[]> {
  const cached = recentSentCache.get(chainId);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const value = fetchRecentSent(chainId, transmitter, windowBlocks);
  recentSentCache.set(chainId, { expiresAt: Date.now() + RECENT_SENT_TTL_MS, value });
  // evict on failure so the next request retries rather than serving a rejection
  value.catch(() => {
    if (recentSentCache.get(chainId)?.value === value) recentSentCache.delete(chainId);
  });
  return value;
}

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

async function fetchCctpGapBackfill({
  walletAddress,
  sourceChainId,
  targetChainId,
}: {
  walletAddress: Address;
  sourceChainId: ChainId;
  targetChainId: ChainId;
}): Promise<CctpTransfers> {
  const sourceTransmitter = MESSAGE_TRANSMITTER[sourceChainId];
  const targetTransmitter = MESSAGE_TRANSMITTER[targetChainId];
  const recentWindowBlocks = RECENT_WINDOW_BLOCKS[sourceChainId];
  if (!sourceTransmitter || !targetTransmitter || !recentWindowBlocks) {
    return { pending: [], completed: [] };
  }

  const wallet = walletAddress.toLowerCase();
  const recentSent = await getRecentSent(sourceChainId, sourceTransmitter, recentWindowBlocks);
  const sent = recentSent.filter(
    (s) =>
      s.decoded.sender.toLowerCase() === wallet || s.decoded.recipient.toLowerCase() === wallet,
  );
  if (sent.length === 0) return { pending: [], completed: [] };

  // Completion: query MessageReceived on the target by the indexed nonces we found
  // (keeps the response tiny so a wide range is safe). `nonce` is unique only per
  // source domain, so the map is keyed by sourceDomain + nonce.
  const targetClient = createServerSidePublicClient(targetChainId);
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

  const sourceClient = createServerSidePublicClient(sourceChainId);
  const sourceTimestamps = await fetchBlockTimestamps(
    sourceClient,
    sent.map((s) => s.blockNumber),
  );
  const matchedTargetBlocks = sent
    .map((s) => received.get(`${s.decoded.sourceDomain}-${s.decoded.nonce}`)?.blockNumber)
    .filter((bn): bn is bigint => typeof bn === 'bigint');
  const targetTimestamps = await fetchBlockTimestamps(targetClient, matchedTargetBlocks);

  const pending: PendingCCTPTransfer[] = [];
  const completed: CompletedCCTPTransfer[] = [];

  for (const { blockNumber, transactionHash, message, decoded } of sent) {
    const attestationHash = keccak256(message);
    const messageSent: MessageSent = {
      attestationHash,
      blockNumber: blockNumber.toString(),
      blockTimestamp: String(sourceTimestamps.get(blockNumber.toString()) ?? 0),
      id: attestationHash,
      message,
      nonce: decoded.nonce,
      sender: decoded.sender,
      recipient: decoded.recipient,
      sourceDomain: String(decoded.sourceDomain) as `${ChainDomain}`,
      transactionHash,
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
 * Merge subgraph CCTP results with the chain-log backfill, deduped by tx hash.
 * Completed wins over pending for the same tx (so the backfill's mint upgrades a
 * stale subgraph "pending"); among the same status the subgraph wins. Enable-gated
 * and fail-open: any backfill error returns the subgraph results untouched.
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
  if (process.env.CCTP_GAP_BACKFILL_ENABLED !== 'true') {
    return { ...subgraph, meta: { enabled: false } };
  }

  try {
    const backfill = await fetchCctpGapBackfill({
      walletAddress,
      sourceChainId: type === 'deposits' ? l1ChainId : l2ChainId,
      targetChainId: type === 'deposits' ? l2ChainId : l1ChainId,
    });

    const txKey = (t: PendingCCTPTransfer) => t.messageSent.transactionHash.toLowerCase();

    // completed wins over pending for the same tx; subgraph wins within a status
    const completedByTx = new Map<string, CompletedCCTPTransfer>();
    for (const t of [...subgraph.completed, ...backfill.completed]) {
      const key = txKey(t);
      if (!completedByTx.has(key)) completedByTx.set(key, t);
    }
    const pendingByTx = new Map<string, PendingCCTPTransfer>();
    for (const t of [...subgraph.pending, ...backfill.pending]) {
      const key = txKey(t);
      if (!completedByTx.has(key) && !pendingByTx.has(key)) pendingByTx.set(key, t);
    }

    const pending = [...pendingByTx.values()];
    const completed = [...completedByTx.values()];
    const subgraphKeys = new Set([...subgraph.pending, ...subgraph.completed].map(txKey));
    const subgraphPendingKeys = new Set(subgraph.pending.map(txKey));

    return {
      pending,
      completed,
      meta: {
        enabled: true,
        addedPending: pending.filter((t) => !subgraphKeys.has(txKey(t))).length,
        addedCompleted: completed.filter((t) => !subgraphKeys.has(txKey(t))).length,
        upgraded: completed.filter((t) => subgraphPendingKeys.has(txKey(t))).length,
      },
    };
  } catch (error) {
    logger.warn(`[cctp] gap backfill failed, returning subgraph-only data: ${error}`);
    return { ...subgraph, meta: { enabled: true, error: String(error) } };
  }
}
