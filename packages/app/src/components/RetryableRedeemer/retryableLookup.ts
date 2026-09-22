import { ParentToChildMessageStatus, ParentTransactionReceipt } from '@arbitrum/sdk';
import { InboxMessageKind } from '@arbitrum/sdk/dist/lib/dataEntities/message';
import type { Provider } from '@ethersproject/abstract-provider';

import { addressesEqual } from '@/bridge/util/AddressEquality';
import {
  getChainByChainId,
  getSupportedChainIds,
  isArbitrumChain,
  sortChainIds,
} from '@/bridge/util/networks';
import { normalizeTimestamp } from '@/bridge/util/normalizeTimestamp';

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

export type RetryableStatusDisplay = {
  label: string;
  description: string;
  isRedeemable: boolean;
};

export function getRetryableStatusDisplay(
  status: ParentToChildMessageStatus,
): RetryableStatusDisplay {
  switch (status) {
    case ParentToChildMessageStatus.NOT_YET_CREATED:
      return {
        label: 'Not created yet',
        description:
          'The destination chain has not picked up the ticket yet. Check again in a few minutes.',
        isRedeemable: false,
      };
    case ParentToChildMessageStatus.CREATION_FAILED:
      return {
        label: 'Creation failed',
        description:
          'The ticket failed to be created on the destination chain, so there is nothing to redeem.',
        isRedeemable: false,
      };
    case ParentToChildMessageStatus.FUNDS_DEPOSITED_ON_CHILD:
      return {
        label: 'Ready to redeem',
        description:
          'Auto-redeem did not go through. Redeem manually to move the funds to the destination address.',
        isRedeemable: true,
      };
    case ParentToChildMessageStatus.REDEEMED:
      return {
        label: 'Redeemed',
        description: 'The funds have arrived at the destination address.',
        isRedeemable: false,
      };
    case ParentToChildMessageStatus.EXPIRED:
      return {
        label: 'Expired',
        description: 'The ticket was not redeemed within 7 days and can no longer be redeemed.',
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

export type Retryable = {
  retryableCreationId: string;
  status: ParentToChildMessageStatus;
  /** ms timestamp, resolved only while the ticket is still redeemable */
  expiresAt: number | null;
};

export type RetryableLookupResult =
  | { type: 'transactionNotFound' }
  | { type: 'classicTransaction' }
  | { type: 'ethDeposit' }
  | { type: 'noRetryables' }
  | { type: 'retryables'; retryables: Retryable[] };

export async function lookupRetryables({
  parentChainTxHash,
  parentChainProvider,
  childChainProvider,
  inbox,
}: {
  parentChainTxHash: string;
  parentChainProvider: Provider;
  childChainProvider: Provider;
  inbox: string;
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
      inbox,
    });

    return ethDeposits > 0 ? { type: 'ethDeposit' } : { type: 'noRetryables' };
  }

  const retryables = await Promise.all(
    messages.map(async (message): Promise<Retryable> => {
      const status = await message.status();

      return {
        retryableCreationId: message.retryableCreationId,
        status,
        expiresAt:
          status === ParentToChildMessageStatus.FUNDS_DEPOSITED_ON_CHILD
            ? normalizeTimestamp((await message.getTimeout()).toNumber())
            : null,
      };
    }),
  );

  return { type: 'retryables', retryables };
}
