import {
  ChildToParentMessageStatus,
  ChildTransactionReceipt,
  ParentToChildMessageStatus,
  ParentTransactionReceipt,
} from '@arbitrum/sdk';
import type { RouteExtended } from '@lifi/sdk';
import { BigNumber } from 'ethers';
import { useRef, useState } from 'react';
import useSWR from 'swr';
import { useSwitchChain } from 'wagmi';

import { fetchOftTransactionsByTxHash } from '@/bridge/hooks/useOftTransactionHistory';
import { BridgeTransferStarterFactory } from '@/bridge/token-bridge-sdk/BridgeTransferStarterFactory';
import { resumeLifiRoute } from '@/bridge/token-bridge-sdk/LifiRouteExecutor';
import { LifiTransferStarter } from '@/bridge/token-bridge-sdk/LifiTransferStarter';
import { OftV2TransferStarter } from '@/bridge/token-bridge-sdk/OftV2TransferStarter';
import { getProviderForChainId } from '@/bridge/token-bridge-sdk/utils';
import {
  getExecutedLifiRouteTxHash,
  isLifiRouteComplete,
} from '@/bridge/util/LifiTransactionStatus';
import { isNetwork } from '@/bridge/util/networks';
import { wagmiConfig } from '@/bridge/util/wagmi/setup';
import { useEvmWallet } from '@/bridge/wallet/useEvmWallet';

import { DemoRoute, QuoteRequest, starterProps } from './demoRoutes';

type TransferPhase =
  | 'signing'
  | 'approving'
  | 'submitted'
  | 'bridging'
  | 'claimable'
  | 'claiming'
  | 'done'
  | 'error';
export type DemoTransfer = {
  id: string;
  request: QuoteRequest & { sender: string; recipient: string };
  route: DemoRoute;
  createdAt: number;
  phase: TransferPhase;
  hash?: string;
  error?: string;
  trackingError?: string;
  lifiRoute?: RouteExtended;
};

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'The wallet request failed.';
}

async function transferStatus(transfer: DemoTransfer): Promise<TransferPhase> {
  if (!transfer.hash) return transfer.phase;
  if (transfer.route.kind === 'lifi')
    return isLifiRouteComplete(transfer.lifiRoute) ? 'done' : transfer.phase;
  const sourceProvider = getProviderForChainId(transfer.request.source.chainId);
  const destinationProvider = getProviderForChainId(transfer.request.destination.chainId);
  const receipt = await sourceProvider.getTransactionReceipt(transfer.hash);
  if (!receipt) return 'submitted';
  if (receipt.status === 0) return 'error';
  if (transfer.route.kind === 'layerzero') {
    const transactions = await fetchOftTransactionsByTxHash({
      txHash: transfer.hash,
      isTestnet: isNetwork(transfer.request.source.chainId).isTestnet,
    });
    if (transactions.some((tx) => tx.status === 'failed')) return 'error';
    return transactions.length && transactions.every((tx) => tx.status === 'success')
      ? 'done'
      : 'bridging';
  }
  if (transfer.route.withdrawal) {
    const messages = await new ChildTransactionReceipt(receipt).getChildToParentMessages(
      destinationProvider,
    );
    const statuses = await Promise.all(messages.map((message) => message.status(sourceProvider)));
    if (
      statuses.length &&
      statuses.every((status) => status === ChildToParentMessageStatus.EXECUTED)
    )
      return 'done';
    if (statuses.some((status) => status === ChildToParentMessageStatus.CONFIRMED))
      return 'claimable';
    return 'bridging';
  }
  const messages = await new ParentTransactionReceipt(receipt).getParentToChildMessages(
    destinationProvider,
  );
  const statuses = await Promise.all(messages.map((message) => message.status()));
  if (statuses.length && statuses.every((status) => status === ParentToChildMessageStatus.REDEEMED))
    return 'done';
  if (statuses.some((status) => status === ParentToChildMessageStatus.EXPIRED)) return 'error';
  return 'bridging';
}

export function useDemoTransfers() {
  const wallet = useEvmWallet();
  const { switchChainAsync } = useSwitchChain();
  const [transfers, setTransfers] = useState<DemoTransfer[]>([]);
  const busy = useRef(false);
  function update(id: string, patch: Partial<DemoTransfer>) {
    setTransfers((current) => current.map((tx) => (tx.id === id ? { ...tx, ...patch } : tx)));
  }
  const pending = transfers.filter(
    (tx) =>
      tx.hash &&
      ['submitted', 'bridging', 'claimable'].includes(tx.phase) &&
      tx.route.kind !== 'lifi',
  );
  useSWR(
    pending.length ? (['demo-transfer-status', pending] as const) : null,
    async ([, transactions]) => {
      await Promise.all(
        transactions.map(async (tx) => {
          try {
            const phase = await transferStatus(tx);
            if (phase !== tx.phase || tx.trackingError)
              update(tx.id, {
                phase,
                trackingError: undefined,
                error:
                  phase === 'error'
                    ? 'The transfer failed on chain. Check the transaction details.'
                    : undefined,
              });
          } catch {
            if (!tx.trackingError)
              update(tx.id, {
                trackingError:
                  'Status update unavailable. Retrying; the last confirmed status is shown.',
              });
          }
        }),
      );
      return Date.now();
    },
    { refreshInterval: 15_000, revalidateOnFocus: true },
  );

  function lifiCallbacks(id: string) {
    return {
      signers: { evm: wallet.signer },
      switchChainAsync,
      onRouteUpdate: (route: RouteExtended) =>
        update(id, {
          lifiRoute: route,
          hash: getExecutedLifiRouteTxHash(route),
          phase: isLifiRouteComplete(route)
            ? 'done'
            : getExecutedLifiRouteTxHash(route)
              ? 'bridging'
              : 'signing',
        }),
      onRouteExecutionError: (error: unknown, route: RouteExtended | undefined) =>
        update(id, { phase: 'error', error: errorMessage(error), lifiRoute: route }),
    };
  }

  async function start(request: QuoteRequest, route: DemoRoute, onStarted: (id: string) => void) {
    if (busy.current) return;
    const sender = wallet.signer.getAddress();
    if (!sender || sender.toLowerCase() !== request.sender?.toLowerCase())
      throw new Error('Wallet changed. Refresh the quote before continuing.');
    const recipient = request.recipient ?? sender;
    if (Date.now() - route.quotedAt > 90_000)
      throw new Error('This quote expired. Refresh routes before continuing.');
    busy.current = true;
    const id = crypto.randomUUID();
    setTransfers((current) => [
      {
        id,
        request: { ...request, sender, recipient },
        route,
        createdAt: Date.now(),
        phase: 'signing',
      },
      ...current,
    ]);
    onStarted(id);
    try {
      const amount = BigNumber.from(request.amount);
      if (route.kind === 'lifi') {
        const starter = new LifiTransferStarter({ lifiRoute: route.quote });
        await starter.transfer({ amount, destinationAddress: recipient, ...lifiCallbacks(id) });
        return;
      }
      await switchChainAsync({ chainId: request.source.chainId });
      const signer = await wallet.signer.getEthersSigner(request.source.chainId);
      if ((await signer.getAddress()).toLowerCase() !== sender.toLowerCase())
        throw new Error('The signing account changed.');
      const starter = BridgeTransferStarterFactory.create(starterProps(request));
      if (
        await starter.requiresNativeCurrencyApproval({
          amount,
          signer,
          destinationAddress: recipient,
        })
      ) {
        update(id, { phase: 'approving' });
        const approval = await starter.approveNativeCurrency({
          amount,
          signer,
          destinationAddress: recipient,
        });
        await approval?.wait();
      }
      if (
        await starter.requiresTokenApproval({
          amount,
          owner: sender,
          destinationAddress: recipient,
        })
      ) {
        update(id, { phase: 'approving' });
        const approval = await starter.approveToken({ amount, signer });
        await approval?.wait();
      }
      if (wallet.signer.getAddress()?.toLowerCase() !== sender.toLowerCase())
        throw new Error('The signing account changed.');
      update(id, { phase: 'signing' });
      const transfer =
        starter instanceof OftV2TransferStarter
          ? await starter.transfer({ amount, signer, destinationAddress: recipient, wagmiConfig })
          : await starter.transfer({ amount, signer, destinationAddress: recipient });
      update(id, { hash: transfer.sourceChainTransaction.hash, phase: 'submitted' });
    } catch (error) {
      update(id, { phase: 'error', error: errorMessage(error) });
    } finally {
      busy.current = false;
    }
  }

  async function claim(transfer: DemoTransfer) {
    if (busy.current || !transfer.hash || transfer.phase !== 'claimable') return;
    busy.current = true;
    update(transfer.id, { phase: 'claiming', error: undefined });
    try {
      await switchChainAsync({ chainId: transfer.request.destination.chainId });
      const signer = await wallet.signer.getEthersSigner(transfer.request.destination.chainId);
      const provider = getProviderForChainId(transfer.request.source.chainId);
      const receipt = await provider.getTransactionReceipt(transfer.hash);
      const messages = await new ChildTransactionReceipt(receipt).getChildToParentMessages(signer);
      await messages.reduce(async (previous, message) => {
        await previous;
        if ((await message.status(provider)) === ChildToParentMessageStatus.CONFIRMED)
          await (await message.execute(provider)).wait();
      }, Promise.resolve());
      update(transfer.id, { phase: await transferStatus(transfer) });
    } catch (error) {
      update(transfer.id, { phase: 'claimable', error: errorMessage(error) });
    } finally {
      busy.current = false;
    }
  }

  async function resume(transfer: DemoTransfer) {
    if (busy.current || !transfer.lifiRoute) return;
    busy.current = true;
    update(transfer.id, { phase: 'signing', error: undefined });
    try {
      await resumeLifiRoute(transfer.lifiRoute, lifiCallbacks(transfer.id));
    } catch (error) {
      update(transfer.id, { phase: 'error', error: errorMessage(error) });
    } finally {
      busy.current = false;
    }
  }
  return { transfers, start, claim, resume };
}
