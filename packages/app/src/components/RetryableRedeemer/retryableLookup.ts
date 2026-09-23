import {
  ParentToChildMessageReader,
  ParentToChildMessageStatus,
  ParentTransactionReceipt,
} from '@arbitrum/sdk';
import { ArbRetryableTx__factory } from '@arbitrum/sdk/dist/lib/abi/factories/ArbRetryableTx__factory';
import { ARB_RETRYABLE_TX_ADDRESS } from '@arbitrum/sdk/dist/lib/dataEntities/constants';
import { InboxMessageKind } from '@arbitrum/sdk/dist/lib/dataEntities/message';
import type { Provider } from '@ethersproject/abstract-provider';
import { utils } from 'ethers';

import { addressesEqual } from '@/bridge/util/AddressEquality';
import { getBatchFetchBlocks } from '@/bridge/util/chainBlockRanges';
import {
  getChainByChainId,
  getSupportedChainIds,
  isArbitrumChain,
  sortChainIds,
} from '@/bridge/util/networks';
import { normalizeTimestamp } from '@/bridge/util/normalizeTimestamp';

/**
 * viem's `isHash` sizes hex with `Math.ceil`, so it accepts a 63-character string as 32 bytes and
 * a single deleted character reaches the RPC as an INVALID_ARGUMENT. `isHexString` length-checks.
 */
export function isValidTxHash(value: string): boolean {
  return utils.isHexString(value, 32);
}

export type RedeemableChain = {
  chainId: number;
  parentChainId: number;
  inbox: string;
};

/**
 * Only Arbitrum chains receive retryables, and each one has exactly one parent, so the selected
 * chain alone resolves which RPC the source transaction hash has to be looked up on.
 */
export function getRedeemableChain(chainId: number): RedeemableChain | undefined {
  const chain = getChainByChainId(chainId);

  if (!chain || !isArbitrumChain(chain)) {
    return undefined;
  }

  return {
    chainId: chain.chainId,
    parentChainId: chain.parentChainId,
    inbox: chain.ethBridge.inbox,
  };
}

export function getRedeemableChainIds({ isTestnetMode }: { isTestnetMode: boolean }): number[] {
  return sortChainIds(
    getSupportedChainIds({
      includeMainnets: !isTestnetMode,
      includeTestnets: isTestnetMode,
    }).filter((chainId) => typeof getRedeemableChain(chainId) !== 'undefined'),
  );
}

export type RetryableStatusTone = 'positive' | 'negative' | 'neutral';

export type RetryableStatusDisplay = {
  label: string;
  description: string;
  tone: RetryableStatusTone;
  isRedeemable: boolean;
};

export function getRetryableStatusDisplay(status: RetryableStatus): RetryableStatusDisplay {
  switch (status) {
    case INDETERMINATE:
      return {
        label: 'Redeemed or expired',
        description:
          'The ticket is no longer on the chain, so there is nothing to redeem. We could not confirm which of the two it was.',
        tone: 'neutral',
        isRedeemable: false,
      };
    case ParentToChildMessageStatus.NOT_YET_CREATED:
      return {
        label: 'Not created yet',
        description:
          'The Arbitrum chain has not picked up the ticket yet. Check again in a few minutes.',
        tone: 'neutral',
        isRedeemable: false,
      };
    case ParentToChildMessageStatus.CREATION_FAILED:
      return {
        label: 'Creation failed',
        description:
          'The ticket failed to be created on the Arbitrum chain, so there is nothing to redeem.',
        tone: 'negative',
        isRedeemable: false,
      };
    case ParentToChildMessageStatus.FUNDS_DEPOSITED_ON_CHILD:
      return {
        label: 'Ready to redeem',
        description: 'Automatic redemption did not complete. You can retry this message.',
        tone: 'positive',
        isRedeemable: true,
      };
    case ParentToChildMessageStatus.REDEEMED:
      return {
        label: 'Redeemed',
        description: 'The ticket was executed on the Arbitrum chain. Nothing left to do.',
        tone: 'positive',
        isRedeemable: false,
      };
    case ParentToChildMessageStatus.EXPIRED:
      return {
        label: 'Expired',
        description: 'Automatic redemption did not complete.',
        tone: 'negative',
        isRedeemable: false,
      };
  }
}

type MessageEvent = {
  bridgeMessageEvent: {
    kind: number;
    inbox: string;
  };
};

/**
 * `getEthDeposits` does not filter by inbox, so an ETH deposit heading to a sibling chain would
 * otherwise be reported against whichever chain the user happened to pick.
 */
export function countEthDepositsForInbox({
  messageEvents,
  inbox,
}: {
  messageEvents: MessageEvent[];
  inbox: string;
}): number {
  return messageEvents.filter(
    (event) =>
      event.bridgeMessageEvent.kind === InboxMessageKind.L1MessageType_ethDeposit &&
      addressesEqual(event.bridgeMessageEvent.inbox, inbox),
  ).length;
}

/**
 * `status()` only walks the chain's logs once it knows the ticket is gone and auto-redeem did not
 * succeed, so an unresolved status is never a redeemable one — see `INDETERMINATE` below.
 */
export const INDETERMINATE = 'indeterminate' as const;

export type RetryableStatus = ParentToChildMessageStatus | typeof INDETERMINATE;

export type Retryable = {
  retryableCreationId: string;
  status: RetryableStatus;
  /** ms timestamp, resolved only while the ticket is still redeemable */
  expiresAt: number | null;
};

export type RetryableLookupResult =
  | { type: 'transactionNotFound' }
  | { type: 'classicTransaction' }
  | { type: 'ethDeposit' }
  | { type: 'noRetryables' }
  | { type: 'retryables'; retryables: Retryable[] };

/**
 * How many log queries the manual-redeem search may spend before giving up. The window it can ask
 * for is capped per chain, so on a chain with a small cap the ticket's lifetime does not fit in a
 * sane number of requests — better to report the status as unresolved than to hang the panel.
 */
const MAX_REDEEM_LOG_QUERIES = 12;

/** matches the transaction history's own default for chains that cap nothing we have hit */
const DEFAULT_BATCH_FETCH_BLOCKS = 5_000_000;

/**
 * Distinguishes a ticket redeemed by a later manual redeem from one that expired. Both are terminal
 * and neither is redeemable, so this is informational: it walks `RedeemScheduled` logs in windows
 * the chain's RPC will actually serve, and reports an unresolved status rather than erroring.
 */
async function findManualRedeem({
  childChainProvider,
  childChainId,
  retryableCreationId,
  fromBlock,
}: {
  childChainProvider: Provider;
  childChainId: number;
  retryableCreationId: string;
  fromBlock: number;
}): Promise<RetryableStatus> {
  const batchSizeBlocks = getBatchFetchBlocks(childChainId) ?? DEFAULT_BATCH_FETCH_BLOCKS;
  const contract = ArbRetryableTx__factory.connect(ARB_RETRYABLE_TX_ADDRESS, childChainProvider);
  const filter = contract.filters.RedeemScheduled(retryableCreationId);

  const headBlock = await childChainProvider.getBlockNumber();

  let from = fromBlock;

  for (let query = 0; query < MAX_REDEEM_LOG_QUERIES && from <= headBlock; query++) {
    const to = Math.min(from + batchSizeBlocks, headBlock);
    // sequential on purpose: a redeem is usually close to creation, so stopping at the first hit
    // costs one request where firing every window at once would always cost all of them
    // eslint-disable-next-line no-await-in-loop
    const events = await contract.queryFilter(filter, from, to);

    if (events.length > 0) {
      return ParentToChildMessageStatus.REDEEMED;
    }

    from = to + 1;
  }

  // the whole range was covered without a redeem, so the ticket must have expired
  return from > headBlock ? ParentToChildMessageStatus.EXPIRED : INDETERMINATE;
}

async function resolveRetryable({
  message,
  childChainProvider,
  childChainId,
}: {
  message: ParentToChildMessageReader;
  childChainProvider: Provider;
  childChainId: number;
}): Promise<Retryable> {
  const retryableCreationId = message.retryableCreationId;
  const creationReceipt = await message.getRetryableCreationReceipt();

  if (!creationReceipt) {
    return {
      retryableCreationId,
      status: ParentToChildMessageStatus.NOT_YET_CREATED,
      expiresAt: null,
    };
  }

  if (creationReceipt.status === 0) {
    return {
      retryableCreationId,
      status: ParentToChildMessageStatus.CREATION_FAILED,
      expiresAt: null,
    };
  }

  // checked before the ticket itself, same as the SDK: the common success case costs one call
  const autoRedeem = await message.getAutoRedeemAttempt();

  if (autoRedeem?.status === 1) {
    return { retryableCreationId, status: ParentToChildMessageStatus.REDEEMED, expiresAt: null };
  }

  // `getTimeout` reverts with NoTicketWithID once the ticket is gone, so a resolved timeout still
  // in the future is exactly the redeemable case
  const timeout = await message.getTimeout().catch(() => null);
  const expiresAt = timeout === null ? null : normalizeTimestamp(timeout.toNumber());

  if (expiresAt !== null && expiresAt > Date.now()) {
    return {
      retryableCreationId,
      status: ParentToChildMessageStatus.FUNDS_DEPOSITED_ON_CHILD,
      expiresAt,
    };
  }

  const status = await findManualRedeem({
    childChainProvider,
    childChainId,
    retryableCreationId,
    fromBlock: creationReceipt.blockNumber,
  }).catch(() => INDETERMINATE);

  return { retryableCreationId, status, expiresAt: null };
}

export async function lookupRetryables({
  parentChainTxHash,
  parentChainProvider,
  childChainProvider,
  childChain,
}: {
  parentChainTxHash: string;
  parentChainProvider: Provider;
  childChainProvider: Provider;
  childChain: RedeemableChain;
}): Promise<RetryableLookupResult> {
  const receipt = await parentChainProvider.getTransactionReceipt(parentChainTxHash);

  if (!receipt) {
    return { type: 'transactionNotFound' };
  }

  const parentChainTxReceipt = new ParentTransactionReceipt(receipt);

  // pre-Nitro Arbitrum One deposits use the classic message format, which `getParentToChildMessages`
  // throws on. Check up front rather than matching on the thrown message.
  if (await parentChainTxReceipt.isClassic(childChainProvider)) {
    return { type: 'classicTransaction' };
  }

  // already filters on the selected chain's inbox, so a hash belonging to a sibling chain
  // resolves to no retryables rather than to statuses read off the wrong chain
  const messages = await parentChainTxReceipt.getParentToChildMessages(childChainProvider);

  if (messages.length === 0) {
    const ethDeposits = countEthDepositsForInbox({
      messageEvents: parentChainTxReceipt.getMessageEvents(),
      inbox: childChain.inbox,
    });

    return ethDeposits > 0 ? { type: 'ethDeposit' } : { type: 'noRetryables' };
  }

  const retryables = await Promise.all(
    messages.map((message) =>
      resolveRetryable({ message, childChainProvider, childChainId: childChain.chainId }),
    ),
  );

  return { type: 'retryables', retryables };
}
