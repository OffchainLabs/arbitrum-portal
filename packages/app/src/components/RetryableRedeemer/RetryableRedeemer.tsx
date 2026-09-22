'use client';

import { ParentToChildMessageStatus } from '@arbitrum/sdk';
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react';
import {
  ArrowPathIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ClockIcon,
  DocumentDuplicateIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import dayjs from 'dayjs';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useCopyToClipboard } from 'react-use';
import { twMerge } from 'tailwind-merge';
import { isHash } from 'viem';
import { useAccount } from 'wagmi';
import { getConnectorClient } from 'wagmi/actions';

import { TransactionHistorySearchError } from '@/bridge/components/TransactionHistory/TransactionHistorySearchBar';
import { Button } from '@/bridge/components/common/Button';
import { ExternalLink } from '@/bridge/components/common/ExternalLink';
import { errorToast } from '@/bridge/components/common/atoms/Toast';
import { GET_HELP_LINK, RETRYABLE_TICKET_DOCS_LINK } from '@/bridge/constants';
import { useSwitchNetworkWithConfig } from '@/bridge/hooks/useSwitchNetworkWithConfig';
import { trackEvent } from '@/bridge/util/AnalyticsUtils';
import { shortenTxHash } from '@/bridge/util/CommonUtils';
import { getRetryableTicket } from '@/bridge/util/RetryableUtils';
import { formatTransactionError, isUserRejectedError } from '@/bridge/util/isUserRejectedError';
import { getExplorerUrl, getNetworkName, isNetwork } from '@/bridge/util/networks';
import { wagmiConfig } from '@/bridge/util/wagmi/setup';
import { clientToSigner } from '@/bridge/util/wagmi/useEthersSigner';
import { useWalletModal } from '@/bridge/wallet/hooks/useWalletModal';
import { getProviderForChainId } from '@/token-bridge-sdk/utils';

import { ChainSelectDropdown } from './ChainSelectDropdown';
import {
  Retryable,
  RetryableLookupResult,
  RetryableStatusTone,
  getRedeemableChain,
  getRedeemableChainIds,
  getRetryableStatusDisplay,
} from './retryableLookup';
import { useRetryableLookup } from './useRetryableLookup';

const toneClassName: Record<RetryableStatusTone, string> = {
  positive: 'text-claim',
  warning: 'text-pending',
  negative: 'text-destructive',
  neutral: 'text-white/70',
};

const toneIcon: Record<RetryableStatusTone, typeof ClockIcon> = {
  positive: CheckCircleIcon,
  warning: ArrowPathIcon,
  negative: ExclamationCircleIcon,
  neutral: ClockIcon,
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-sm text-white/70">{children}</span>;
}

function Message({ children, isError }: { children: React.ReactNode; isError?: boolean }) {
  return (
    <p className={twMerge('text-sm text-white/70', isError && 'text-destructive')}>{children}</p>
  );
}

function TicketDetail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
      <span className="shrink-0 text-white/70">{label}</span>
      <span className="break-all text-right sm:text-right">{children}</span>
    </div>
  );
}

function RetryableCard({
  retryable,
  childChainId,
  parentChainId,
  parentChainTxHash,
  isConnected,
  isRedeeming,
  isRedeemDisabled,
  onRedeem,
  onConnect,
}: {
  retryable: Retryable;
  childChainId: number;
  parentChainId: number;
  parentChainTxHash: string;
  isConnected: boolean;
  isRedeeming: boolean;
  isRedeemDisabled: boolean;
  onRedeem: () => void;
  onConnect: () => void;
}) {
  const { label, description, tone, isRedeemable } = getRetryableStatusDisplay(retryable.status);
  const StatusIcon = toneIcon[tone];

  return (
    <div className="overflow-hidden rounded border border-gray-dark bg-default-black">
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <span className={twMerge('flex items-center gap-2 text-base', toneClassName[tone])}>
            <StatusIcon className="h-5 w-5 shrink-0" />
            {label}
          </span>
          {/* the ticket id only exists on the chain once it has been created */}
          {retryable.status !== ParentToChildMessageStatus.NOT_YET_CREATED && (
            <span className="shrink-0 font-mono text-sm text-white/50">
              {shortenTxHash(retryable.retryableCreationId)}
            </span>
          )}
        </div>

        <Message>{description}</Message>

        {retryable.expiresAt !== null && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="flex items-center gap-2">
              <ClockIcon className="h-4 w-4 shrink-0" />
              Expires {dayjs(retryable.expiresAt).fromNow()}
            </span>
            <span className="text-white/50">
              {dayjs.utc(retryable.expiresAt).format('MMM D, YYYY, HH:mm [UTC]')}
            </span>
          </div>
        )}

        <Disclosure>
          {({ open }) => (
            <>
              <DisclosureButton className="arb-hover flex w-fit items-center gap-1 text-sm text-white/70">
                Ticket details
                <ChevronDownIcon className={twMerge('h-4 w-4', open && 'rotate-180')} />
              </DisclosureButton>
              <DisclosurePanel className="flex flex-col gap-2 pt-3 text-sm">
                {retryable.status !== ParentToChildMessageStatus.NOT_YET_CREATED && (
                  <TicketDetail label="Ticket">
                    <ExternalLink
                      className="arb-hover underline"
                      href={`${getExplorerUrl(childChainId)}/tx/${retryable.retryableCreationId}`}
                    >
                      {retryable.retryableCreationId}
                    </ExternalLink>
                  </TicketDetail>
                )}
                <TicketDetail label={`Sent from ${getNetworkName(parentChainId)}`}>
                  <ExternalLink
                    className="arb-hover underline"
                    href={`${getExplorerUrl(parentChainId)}/tx/${parentChainTxHash}`}
                  >
                    {parentChainTxHash}
                  </ExternalLink>
                </TicketDetail>
                <TicketDetail label="Destination chain">
                  {getNetworkName(childChainId)}
                </TicketDetail>
              </DisclosurePanel>
            </>
          )}
        </Disclosure>
      </div>

      {isRedeemable && (
        <div className="flex flex-col gap-2 border-t border-gray-dark p-4">
          {isConnected ? (
            <Button
              variant="primary"
              onClick={onRedeem}
              loading={isRedeeming}
              disabled={isRedeemDisabled}
              className="w-full justify-center border-primary-cta bg-primary-cta py-3 hover:bg-primary-cta/80"
            >
              {isRedeeming ? 'Redeeming…' : `Redeem on ${getNetworkName(childChainId)}`}
            </Button>
          ) : (
            <>
              <Button
                variant="primary"
                onClick={onConnect}
                className="w-full justify-center border-primary-cta bg-primary-cta py-3 hover:bg-primary-cta/80"
              >
                Connect wallet to redeem
              </Button>
              <Message>Connect only when you&apos;re ready to redeem.</Message>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function LookupResult({
  result,
  childChainId,
  parentChainId,
  renderRetryable,
}: {
  result: RetryableLookupResult;
  childChainId: number;
  parentChainId: number;
  renderRetryable: (retryable: Retryable) => React.ReactNode;
}) {
  const networkName = getNetworkName(childChainId);

  switch (result.type) {
    case 'transactionNotFound':
      return (
        <Message isError>
          No transaction with that hash on {getNetworkName(parentChainId)}. Double-check the hash,
          and that {networkName} is the chain the message was sent to.
        </Message>
      );
    case 'classicTransaction':
      return (
        <Message isError>
          This is a pre-Nitro (classic) transaction, which this tool cannot read.
        </Message>
      );
    case 'ethDeposit':
      return (
        <Message>
          This is a plain ETH deposit to {networkName}. It is credited automatically and has no
          ticket to redeem.
        </Message>
      );
    case 'noRetryables':
      return (
        <Message>
          This transaction created no retryable tickets for {networkName}. If the message was sent
          to a different chain, select that chain and check again.
        </Message>
      );
    case 'retryables':
      return <>{result.retryables.map(renderRetryable)}</>;
  }
}

export function RetryableRedeemer({
  initialChainId,
  initialTxHash,
}: {
  initialChainId: number | undefined;
  initialTxHash: string | undefined;
}) {
  const pathname = usePathname();
  const { isConnected, chainId: connectedChainId } = useAccount();
  const { openConnectModal } = useWalletModal();
  const { switchChainAsync } = useSwitchNetworkWithConfig();
  const [, copyToClipboard] = useCopyToClipboard();

  const [isTestnetMode, setIsTestnetMode] = useState(
    () => typeof initialChainId === 'number' && isNetwork(initialChainId).isTestnet,
  );
  const [selectedChainId, setSelectedChainId] = useState(initialChainId);
  const [txHashInput, setTxHashInput] = useState(initialTxHash ?? '');
  const [submittedTxHash, setSubmittedTxHash] = useState(
    initialTxHash && isHash(initialTxHash) ? initialTxHash : undefined,
  );
  const [inputError, setInputError] = useState<string>();
  const [redeemingId, setRedeemingId] = useState<string>();
  const [isLinkCopied, setIsLinkCopied] = useState(false);

  const chainIds = getRedeemableChainIds({ isTestnetMode });
  // derived rather than synced, so flipping testnet mode can never leave a chain selected that is
  // no longer in the list
  const childChainId =
    selectedChainId && chainIds.includes(selectedChainId) ? selectedChainId : chainIds[0];

  const { data, error, isLoading, mutate } = useRetryableLookup({
    childChainId,
    parentChainTxHash: submittedTxHash,
  });

  // The lookup re-runs whenever the effective chain changes, not only on submit, so the url has to
  // track that same derived value: otherwise a copied link names a chain the result never came from.
  // `replaceState` rather than `router.replace`, to avoid a server round-trip for client-only state.
  useEffect(() => {
    if (typeof childChainId === 'undefined') {
      return;
    }

    const params = new URLSearchParams({ chainId: String(childChainId) });

    if (submittedTxHash) {
      params.set('tx', submittedTxHash);
    }

    window.history.replaceState(null, '', `${pathname}?${params.toString()}`);
  }, [childChainId, pathname, submittedTxHash]);

  // Editing the field drops the previous result, so a ticket on screen always belongs to the hash
  // currently in the box, otherwise a failed re-check leaves a stale, redeemable-looking row.
  const handleInputChange = useCallback((value: string) => {
    setTxHashInput(value);
    setInputError(undefined);
    setSubmittedTxHash(undefined);
    setIsLinkCopied(false);
  }, []);

  const handleSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      const value = txHashInput.trim();

      if (!isHash(value)) {
        setSubmittedTxHash(undefined);
        setInputError(TransactionHistorySearchError.INVALID_TX_HASH);
        return;
      }

      setInputError(undefined);
      setSubmittedTxHash(value);
    },
    [txHashInput],
  );

  const handleCopyLink = useCallback(() => {
    copyToClipboard(window.location.href);
    setIsLinkCopied(true);
  }, [copyToClipboard]);

  const handleRedeem = useCallback(
    async (retryableCreationId: string) => {
      if (!childChainId || !submittedTxHash) {
        return;
      }

      const chain = getRedeemableChain(childChainId);

      if (!chain) {
        return;
      }

      setRedeemingId(retryableCreationId);

      try {
        if (connectedChainId !== childChainId) {
          await switchChainAsync({ chainId: childChainId });
        }

        // resolved after the switch rather than captured from a hook, so the signer can never be
        // one still pointing at the previously connected chain
        const signer = clientToSigner(
          await getConnectorClient(wagmiConfig, { chainId: childChainId }),
        );

        const ticket = await getRetryableTicket({
          parentChainTxHash: submittedTxHash,
          retryableCreationId,
          parentChainProvider: getProviderForChainId(chain.parentChainId),
          childChainSigner: signer,
        });

        const redeemTx = await ticket.redeem();
        await redeemTx.wait();

        trackEvent('Redeem Retryable', { network: getNetworkName(childChainId) });

        await mutate();
      } catch (error) {
        if (isUserRejectedError(error)) {
          return;
        }
        errorToast(`Couldn't redeem the ticket: ${formatTransactionError(error)}`);
      } finally {
        setRedeemingId(undefined);
      }
    },
    [childChainId, connectedChainId, mutate, submittedTxHash, switchChainAsync],
  );

  const chain = typeof childChainId === 'number' ? getRedeemableChain(childChainId) : undefined;

  if (typeof childChainId === 'undefined' || !chain) {
    return null;
  }

  const parentChainName = getNetworkName(chain.parentChainId);

  return (
    <div className="flex w-full max-w-[720px] flex-col gap-6">
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl">Retryable tickets</h1>
        <p className="text-white/70">
          Check a cross-chain message and redeem it if needed. Select its destination chain and
          enter the transaction hash from the source chain.
        </p>
      </div>

      <form
        className="flex flex-col gap-4 rounded border border-gray-dark bg-default-black p-4 sm:p-6"
        onSubmit={handleSubmit}
      >
        <div className="flex flex-col gap-2">
          <FieldLabel>Destination chain</FieldLabel>
          <ChainSelectDropdown
            chainIds={chainIds}
            selectedChainId={childChainId}
            onChange={setSelectedChainId}
            isTestnetMode={isTestnetMode}
            onTestnetModeChange={setIsTestnetMode}
          />
          <Message>
            {parentChainName} &rarr; {getNetworkName(childChainId)}
          </Message>
        </div>

        <div className="flex flex-col gap-2">
          <FieldLabel>{parentChainName} transaction hash</FieldLabel>
          <input
            type="text"
            value={txHashInput}
            onChange={(event) => handleInputChange(event.target.value)}
            placeholder="0x..."
            aria-label={`${parentChainName} transaction hash`}
            className={twMerge(
              'h-[52px] w-full rounded border border-gray-dark bg-black/20 px-3 text-base text-white outline-none placeholder:text-white/40',
              inputError && 'border-destructive',
            )}
            data-1p-ignore
            data-lpignore="true"
            data-form-type="other"
          />
          <Message isError={typeof inputError !== 'undefined'}>
            {inputError ??
              `Use the transaction from ${parentChainName}, where the message was sent.`}
          </Message>
        </div>

        <Button
          variant="primary"
          type="submit"
          loading={isLoading}
          disabled={isLoading || txHashInput.trim() === ''}
          className="w-full justify-center border-primary-cta bg-primary-cta py-3 hover:bg-primary-cta/80"
        >
          {isLoading ? 'Checking…' : 'Check status'}
        </Button>
      </form>

      {(error || (!isLoading && data)) && (
        <div className="flex flex-col gap-3">
          {/* only a real ticket gets a heading, so the label never sits above an error */}
          {data?.type === 'retryables' && (
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base">
                {data.retryables.length > 1 ? 'Retryable tickets' : 'Retryable ticket'}
              </h2>
              <button
                type="button"
                onClick={handleCopyLink}
                className="arb-hover flex items-center gap-2 text-sm text-white/70"
              >
                <DocumentDuplicateIcon className="h-4 w-4" />
                {isLinkCopied ? 'Copied' : 'Copy link'}
              </button>
            </div>
          )}

          {error ? (
            <Message isError>
              Couldn&apos;t read that transaction:{' '}
              {error instanceof Error ? error.message : 'the RPC request failed.'}
            </Message>
          ) : (
            data &&
            submittedTxHash && (
              <LookupResult
                result={data}
                childChainId={childChainId}
                parentChainId={chain.parentChainId}
                renderRetryable={(retryable) => (
                  <RetryableCard
                    key={retryable.retryableCreationId}
                    retryable={retryable}
                    childChainId={childChainId}
                    parentChainId={chain.parentChainId}
                    parentChainTxHash={submittedTxHash}
                    isConnected={isConnected}
                    isRedeeming={redeemingId === retryable.retryableCreationId}
                    isRedeemDisabled={typeof redeemingId !== 'undefined'}
                    onRedeem={() => handleRedeem(retryable.retryableCreationId)}
                    onConnect={openConnectModal}
                  />
                )}
              />
            )
          )}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 text-sm text-white/70">
        <ExternalLink className="arb-hover underline" href={RETRYABLE_TICKET_DOCS_LINK}>
          About retryable tickets
        </ExternalLink>
        <ExternalLink className="arb-hover underline" href={GET_HELP_LINK}>
          Need help?
        </ExternalLink>
      </div>
    </div>
  );
}
