'use client';

import { ParentToChildMessageStatus } from '@arbitrum/sdk';
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react';
import {
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
  CheckIcon,
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
import { useAccount } from 'wagmi';
import { getConnectorClient } from 'wagmi/actions';

import { TransactionHistorySearchError } from '@/bridge/components/TransactionHistory/TransactionHistorySearchBar';
import { Button } from '@/bridge/components/common/Button';
import { ExternalLink } from '@/bridge/components/common/ExternalLink';
import { NetworkImage } from '@/bridge/components/common/NetworkImage';
import { Loader } from '@/bridge/components/common/atoms/Loader';
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
  isValidTxHash,
} from './retryableLookup';
import { useRetryableLookup } from './useRetryableLookup';

const toneClassName: Record<RetryableStatusTone, string> = {
  positive: 'text-green-hover',
  negative: 'text-red-hover',
  neutral: 'text-white/70',
};

const toneIcon: Record<RetryableStatusTone, typeof ClockIcon> = {
  positive: CheckCircleIcon,
  negative: ExclamationCircleIcon,
  neutral: ClockIcon,
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-sm text-white/55">{children}</span>;
}

function Message({ children, isError }: { children: React.ReactNode; isError?: boolean }) {
  return (
    <p className={twMerge('text-sm leading-[1.4]', isError && 'text-destructive')}>{children}</p>
  );
}

function ResultCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-white/10 bg-neutral-200 p-4 sm:p-6">
      {children}
    </div>
  );
}

function NoTicketCard({ reason }: { reason: React.ReactNode }) {
  return (
    <ResultCard>
      <Message>No ticket found.</Message>
      <p className="text-[13px] leading-[1.4] text-white/55">{reason}</p>
    </ResultCard>
  );
}

function TicketDetail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="shrink-0 text-white/70">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  );
}

function TicketDetailTxLink({
  chainId,
  txHash,
  className,
  showIcon = true,
}: {
  chainId: number;
  txHash: string;
  className?: string;
  showIcon?: boolean;
}) {
  return (
    <ExternalLink
      className={twMerge('arb-hover flex items-center gap-1 underline', className)}
      href={`${getExplorerUrl(chainId)}/tx/${txHash}`}
    >
      {shortenTxHash(txHash)}
      {showIcon && <ArrowTopRightOnSquareIcon className="h-3 w-3 shrink-0" />}
    </ExternalLink>
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
  const StatusIcon = isRedeemable ? ArrowPathIcon : toneIcon[tone];
  const hasExpired = retryable.expiresAt !== null && retryable.expiresAt < Date.now();

  return (
    <ResultCard>
      <div className="flex items-start justify-between gap-3">
        <span className={twMerge('flex items-center gap-2 text-sm', toneClassName[tone])}>
          <StatusIcon className="h-4 w-4 shrink-0" />
          {label}
        </span>
        {retryable.status !== ParentToChildMessageStatus.NOT_YET_CREATED && (
          <TicketDetailTxLink
            chainId={childChainId}
            txHash={retryable.retryableCreationId}
            className="shrink-0 text-sm text-white/55"
            showIcon={false}
          />
        )}
      </div>

      <Message>{description}</Message>

      {retryable.expiresAt !== null && (
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px]">
          <span className="flex items-center gap-1.5">
            <ClockIcon className="h-3.5 w-3.5 shrink-0" />
            {hasExpired ? 'Expired' : 'Expires'} {dayjs(retryable.expiresAt).fromNow()}
          </span>
          <span className="text-white/55">
            {dayjs.utc(retryable.expiresAt).format('MMM D, YYYY, HH:mm [UTC]')}
          </span>
        </div>
      )}

      <Disclosure>
        {({ open }) => (
          <>
            <DisclosureButton className="arb-hover flex w-fit items-center gap-1 text-[13px] text-white/55">
              Ticket details
              <ChevronDownIcon className={twMerge('h-4 w-4', open && 'rotate-180')} />
            </DisclosureButton>
            <DisclosurePanel className="flex flex-col gap-2 text-sm">
              {retryable.status !== ParentToChildMessageStatus.NOT_YET_CREATED && (
                <TicketDetail label="Ticket">
                  <TicketDetailTxLink
                    chainId={childChainId}
                    txHash={retryable.retryableCreationId}
                    className="font-mono"
                  />
                </TicketDetail>
              )}
              <TicketDetail label={`Sent from ${getNetworkName(parentChainId)}`}>
                <TicketDetailTxLink
                  chainId={parentChainId}
                  txHash={parentChainTxHash}
                  className="font-mono"
                />
              </TicketDetail>
              <TicketDetail label="Destination chain">{getNetworkName(childChainId)}</TicketDetail>
            </DisclosurePanel>
          </>
        )}
      </Disclosure>

      {isRedeemable &&
        (isConnected ? (
          <Button
            variant="primary"
            onClick={onRedeem}
            loading={isRedeeming}
            disabled={isRedeemDisabled}
            className="w-full justify-center rounded-[10px] border-cta-border bg-primary-cta py-2.5 hover:bg-primary-cta/80"
          >
            {isRedeeming ? 'Redeeming…' : `Redeem on ${getNetworkName(childChainId)}`}
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={onConnect}
            className="w-full justify-center rounded-[10px] border-cta-border bg-primary-cta py-2.5 hover:bg-primary-cta/80"
          >
            Connect wallet to redeem
          </Button>
        ))}
    </ResultCard>
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
        <NoTicketCard
          reason={`No transaction with that hash on ${getNetworkName(parentChainId)}. Double-check the hash, and that ${networkName} is the chain the message was sent to.`}
        />
      );
    case 'classicTransaction':
      return (
        <NoTicketCard reason="This is a pre-Nitro (classic) transaction, which this tool cannot read." />
      );
    case 'ethDeposit':
      return (
        <NoTicketCard
          reason={`This is a plain ETH deposit to ${networkName}. It is credited automatically and has no ticket to redeem.`}
        />
      );
    case 'noRetryables':
      return (
        <NoTicketCard
          reason={`This transaction created no retryable tickets for ${networkName}. If the message was sent to a different chain, select that chain and check again.`}
        />
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
    initialTxHash && isValidTxHash(initialTxHash) ? initialTxHash : undefined,
  );
  const [inputError, setInputError] = useState<string>();
  const [redeemingId, setRedeemingId] = useState<string>();
  const [isLinkCopied, setIsLinkCopied] = useState(false);

  const chainIds = getRedeemableChainIds({ isTestnetMode });
  // derived, so flipping testnet mode cannot leave a chain selected that is no longer in the list
  const childChainId =
    selectedChainId && chainIds.includes(selectedChainId) ? selectedChainId : chainIds[0];

  const { data, error, isLoading, mutate } = useRetryableLookup({
    childChainId,
    parentChainTxHash: submittedTxHash,
  });

  // the lookup re-runs on every chain change, not just on submit, so a url written only on submit
  // would name a chain the result never came from. `replaceState` skips a server round-trip.
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

  // dropping the result on edit keeps the ticket on screen tied to the hash in the box, so a failed
  // re-check cannot leave a stale, redeemable-looking row behind
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

      if (!isValidTxHash(value)) {
        setSubmittedTxHash(undefined);
        setInputError(TransactionHistorySearchError.INVALID_TX_HASH);
        return;
      }

      setInputError(undefined);
      setSubmittedTxHash(value);
      // resubmitting the same hash leaves the swr key untouched, so nothing would refetch
      mutate();
    },
    [mutate, txHashInput],
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
    <div className="flex w-full flex-col gap-6">
      <p className="text-sm leading-[1.4] text-white/55">
        Check a cross-chain message and redeem it if needed. Select its destination chain and enter
        the transaction hash from the source chain.
      </p>

      <form
        className="flex flex-col gap-6 rounded-xl border border-white/10 bg-default-black/80 p-4 sm:p-6"
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
        </div>

        <div className="flex flex-col gap-2">
          <FieldLabel>Source chain tx hash</FieldLabel>
          <div className="flex items-center gap-2.5">
            <NetworkImage chainId={chain.parentChainId} className="h-6 w-6 p-[2px]" size={24} />
            <span className="font-medium">{parentChainName}</span>
          </div>
          <input
            type="text"
            value={txHashInput}
            onChange={(event) => handleInputChange(event.target.value)}
            placeholder={`Paste tx hash from ${parentChainName}`}
            aria-label={`${parentChainName} transaction hash`}
            className={twMerge(
              'h-12 w-full rounded-md border border-white/10 bg-default-black px-4 text-sm text-white outline-none placeholder:italic placeholder:text-white/50',
              inputError && 'border-destructive',
            )}
            data-1p-ignore
            data-lpignore="true"
            data-form-type="other"
          />
          {inputError && <Message isError>{inputError}</Message>}
        </div>

        <Button
          variant="primary"
          type="submit"
          disabled={txHashInput.trim() === ''}
          className="w-full justify-center rounded-[10px] border-[#96e9a4] bg-positive py-2.5 font-medium text-black hover:bg-positive/80 disabled:border-none disabled:bg-neutral-250 disabled:text-white"
        >
          <span className="flex items-center justify-center gap-1">
            {isLoading ? 'Checking status' : 'Check status'}
            {isLoading && <Loader color="black" size="small" />}
          </span>
        </Button>
      </form>

      {(error || (!isLoading && data)) && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-1.5">
            <h2 className="text-lg font-medium">
              {data?.type === 'retryables' && data.retryables.length > 1
                ? 'Retryable tickets'
                : 'Retryable ticket'}
            </h2>
            <button
              type="button"
              onClick={handleCopyLink}
              aria-label="Copy link to this result"
              className="arb-hover text-white/55"
            >
              {isLinkCopied ? (
                <CheckIcon className="h-5 w-5" />
              ) : (
                <DocumentDuplicateIcon className="h-5 w-5" />
              )}
            </button>
          </div>

          {error ? (
            <ResultCard>
              <Message isError>
                Couldn&apos;t read that transaction:{' '}
                {error instanceof Error ? error.message : 'the RPC request failed.'}
              </Message>
            </ResultCard>
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

      <div className="flex items-center justify-between gap-3 text-[13px] text-white/55">
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
