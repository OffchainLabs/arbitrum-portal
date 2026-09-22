import { ParentToChildMessageStatus } from '@arbitrum/sdk';
import dayjs from 'dayjs';
import { useCallback, useState } from 'react';
import { twMerge } from 'tailwind-merge';
import { isHash } from 'viem';
import { useAccount } from 'wagmi';
import { getConnectorClient } from 'wagmi/actions';

import { TransactionHistorySearchError } from '@/bridge/components/TransactionHistory/TransactionHistorySearchBar';
import { Button } from '@/bridge/components/common/Button';
import { ExternalLink } from '@/bridge/components/common/ExternalLink';
import { Loader } from '@/bridge/components/common/atoms/Loader';
import { errorToast } from '@/bridge/components/common/atoms/Toast';
import { useIsTestnetMode } from '@/bridge/hooks/useIsTestnetMode';
import { useSwitchNetworkWithConfig } from '@/bridge/hooks/useSwitchNetworkWithConfig';
import { trackEvent } from '@/bridge/util/AnalyticsUtils';
import { getRetryableTicket } from '@/bridge/util/RetryableUtils';
import { formatTransactionError, isUserRejectedError } from '@/bridge/util/isUserRejectedError';
import { getExplorerUrl, getNetworkName } from '@/bridge/util/networks';
import { wagmiConfig } from '@/bridge/util/wagmi/setup';
import { clientToSigner } from '@/bridge/util/wagmi/useEthersSigner';
import { useWalletModal } from '@/bridge/wallet/hooks/useWalletModal';
import { getProviderForChainId } from '@/token-bridge-sdk/utils';

import { ChainSelectDropdown } from './ChainSelectDropdown';
import {
  Retryable,
  RetryableLookupResult,
  getRedeemableChain,
  getRedeemableChainIds,
  getRetryableStatusDisplay,
} from './retryableLookup';
import { useRetryableLookup } from './useRetryableLookup';

function Message({ children, isError }: { children: React.ReactNode; isError?: boolean }) {
  return (
    <p className={twMerge('text-sm text-white/70', isError && 'text-destructive')}>{children}</p>
  );
}

function RetryableRow({
  retryable,
  childChainId,
  isRedeeming,
  isRedeemDisabled,
  onRedeem,
}: {
  retryable: Retryable;
  childChainId: number;
  isRedeeming: boolean;
  isRedeemDisabled: boolean;
  onRedeem: () => void;
}) {
  const { label, description, isRedeemable } = getRetryableStatusDisplay(retryable.status);
  const daysUntilExpiry =
    retryable.expiresAt === null ? null : dayjs(retryable.expiresAt).diff(dayjs(), 'day');

  return (
    <div className="flex flex-col gap-2 rounded border border-gray-dark p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-1">
        <span className="text-sm">{label}</span>
        <Message>{description}</Message>
        {daysUntilExpiry !== null && (
          <Message>
            Expires {dayjs(retryable.expiresAt).format('MMM D, YYYY')} (
            {daysUntilExpiry > 0 ? `in ${daysUntilExpiry} day(s)` : 'today'})
          </Message>
        )}
        {/* the ticket id only resolves on the explorer once the chain has created it */}
        {retryable.status !== ParentToChildMessageStatus.NOT_YET_CREATED && (
          <ExternalLink
            className="arb-hover w-fit text-xs text-white/70 underline"
            href={`${getExplorerUrl(childChainId)}/tx/${retryable.retryableCreationId}`}
          >
            View ticket on explorer
          </ExternalLink>
        )}
      </div>

      {isRedeemable && (
        <Button
          variant="secondary"
          onClick={onRedeem}
          loading={isRedeeming}
          disabled={isRedeemDisabled}
          className="shrink-0"
        >
          Redeem
        </Button>
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
          and that {networkName} is the chain you were bridging to.
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
          This transaction created no tickets for {networkName}. If you were bridging to a different
          chain, select that chain and check again.
        </Message>
      );
    case 'retryables':
      return <>{result.retryables.map(renderRetryable)}</>;
  }
}

export function RetryableRedeemer() {
  const [isTestnetMode] = useIsTestnetMode();
  const { isConnected, chainId: connectedChainId } = useAccount();
  const { openConnectModal } = useWalletModal();
  const { switchChainAsync } = useSwitchNetworkWithConfig();

  const [selectedChainId, setSelectedChainId] = useState<number>();
  const [txHashInput, setTxHashInput] = useState('');
  const [submittedTxHash, setSubmittedTxHash] = useState<string>();
  const [inputError, setInputError] = useState<string>();
  const [redeemingId, setRedeemingId] = useState<string>();

  const chainIds = getRedeemableChainIds({ isTestnetMode });
  // derived rather than synced, so flipping testnet mode can never leave a chain selected that is
  // no longer in the list
  const childChainId =
    selectedChainId && chainIds.includes(selectedChainId) ? selectedChainId : chainIds[0];

  const { data, error, isLoading, mutate } = useRetryableLookup({
    childChainId,
    parentChainTxHash: submittedTxHash,
  });

  const handleSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      const value = txHashInput.trim();

      if (!isHash(value)) {
        setInputError(TransactionHistorySearchError.INVALID_TX_HASH);
        return;
      }

      setInputError(undefined);
      setSubmittedTxHash(value);
    },
    [txHashInput],
  );

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

  return (
    <>
      <p className="mb-4 text-sm">
        A deposit that never arrived usually left a redeemable ticket on the destination chain. Pick
        the chain you were bridging to, paste the transaction hash from the chain you sent from, and
        redeem it here.
      </p>

      <div className="mb-4">
        <ChainSelectDropdown
          chainIds={chainIds}
          selectedChainId={childChainId}
          onChange={setSelectedChainId}
        />
      </div>

      <form className="mb-4 flex flex-col items-stretch gap-2 sm:flex-row" onSubmit={handleSubmit}>
        <input
          type="text"
          value={txHashInput}
          onChange={(event) => setTxHashInput(event.target.value)}
          placeholder="Source chain transaction hash"
          aria-label="Source chain transaction hash"
          className={twMerge(
            'h-[44px] w-full rounded border border-gray-dark bg-dark px-3 text-sm text-white outline-none placeholder:text-white/50',
            inputError && 'border-destructive',
          )}
          data-1p-ignore
          data-lpignore="true"
          data-form-type="other"
        />
        <Button
          variant="secondary"
          type="submit"
          disabled={txHashInput.trim() === ''}
          className="h-[44px] shrink-0 justify-center sm:w-[120px]"
        >
          Check
        </Button>
      </form>

      <div className="flex flex-col gap-2">
        {inputError && <Message isError>{inputError}</Message>}

        {isLoading && <Loader size="small" color="white" />}

        {error ? (
          <Message isError>
            Couldn&apos;t read that transaction:{' '}
            {error instanceof Error ? error.message : 'the RPC request failed.'}
          </Message>
        ) : null}

        {!isLoading && !error && data && (
          <LookupResult
            result={data}
            childChainId={childChainId}
            parentChainId={chain.parentChainId}
            renderRetryable={(retryable) => (
              <RetryableRow
                key={retryable.retryableCreationId}
                retryable={retryable}
                childChainId={childChainId}
                isRedeeming={redeemingId === retryable.retryableCreationId}
                isRedeemDisabled={!isConnected || typeof redeemingId !== 'undefined'}
                onRedeem={() => handleRedeem(retryable.retryableCreationId)}
              />
            )}
          />
        )}

        {!isConnected &&
          data?.type === 'retryables' &&
          data.retryables.some(
            (retryable) => getRetryableStatusDisplay(retryable.status).isRedeemable,
          ) && (
            <Button variant="secondary" onClick={openConnectModal} className="w-fit">
              Connect wallet to redeem
            </Button>
          )}
      </div>
    </>
  );
}
