'use client';

import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Popover,
  PopoverButton,
  PopoverPanel,
} from '@headlessui/react';
import { useDebounce } from '@uidotdev/usehooks';
import { BigNumber, utils } from 'ethers';
import { ReactNode, useEffect, useRef, useState } from 'react';
import useSWR from 'swr';
import { isAddress } from 'viem';
import { useAccount } from 'wagmi';

import { TopToken, tokenKey } from '@/app/src/token-registry/registryFiles';
import { NATIVE_TOKEN_ADDRESS } from '@/app/src/token-registry/types';
import { NOVA_MAX_ETH_DEPOSIT_AMOUNT, isNovaDestination } from '@/bridge/util/NovaUtils';
import { getBridgeUiConfigForChain } from '@/bridge/util/bridgeUiConfig';
import { getExplorerUrl } from '@/bridge/util/networks';
import { appKit } from '@/bridge/util/wagmi/setup';

import { Icon, Spinner, TokenImage, duration, quantity, shortAddress, usd } from './DemoAtoms';
import './demo.css';
import { costUsd, parseAmount, spendableBalance } from './demoAmounts';
import { DemoRoute, QuoteRequest, fetchRoutes } from './demoRoutes';
import { DemoTransfer, useDemoTransfers } from './useDemoTransfers';

const chainName = (id: number) => getBridgeUiConfigForChain(id).network.name;
const connect = () => void appKit.open({ view: 'Connect', namespace: 'eip155' });
const amountText = (amount: string, token: TopToken) =>
  quantity(utils.formatUnits(amount, token.decimals));

function AssetButton({
  token,
  side,
  onClick,
  onIntent,
}: {
  token?: TopToken;
  side: 'source' | 'destination';
  onClick: () => void;
  onIntent?: () => void;
}) {
  return (
    <button
      className="pill"
      aria-label={`Select ${side} token and network`}
      onClick={onClick}
      onPointerEnter={onIntent}
      onFocus={onIntent}
    >
      {token && <TokenImage key={tokenKey(token)} token={token} size={32} />}
      <span className="pill-text">
        <span className="pill-sym">{token?.symbol ?? 'Select token'}</span>
        <span className="pill-net">{token ? chainName(token.chainId) : 'Select network'}</span>
      </span>
      <Icon name="down" size={14} />
    </button>
  );
}

function RouteVia({ route }: { route: DemoRoute }) {
  return (
    <span className="rvia">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="tool-ic" src={route.icon} alt="" width={20} height={20} />
      <span className="rvia-name">{route.name}</span>
      {route.kind === 'lifi' && <span className="rvia-lifi">via LI.FI</span>}
    </span>
  );
}

function RouteCard({
  route,
  destination,
  selected,
  onSelect,
  prices,
  best,
  fastest,
}: {
  route: DemoRoute;
  destination: TopToken;
  selected: boolean;
  onSelect: () => void;
  prices: Record<string, number>;
  best: boolean;
  fastest: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const gasUsd = route.estimateError ? undefined : costUsd([...route.gas, ...route.fee], prices);
  return (
    <article className={`route${selected ? ' is-on' : ''}`}>
      <button className="route-main" onClick={onSelect} aria-pressed={selected}>
        <span className={`route-radio${selected ? ' is-on' : ''}`}>
          {selected && <Icon name="check" size={12} />}
        </span>
        <span className="route-top">
          <span className="rtags">
            {best && <span className="chip chip-best">Best return</span>}
            {fastest && <span className="chip chip-fast">Fastest</span>}
            {route.kind === 'canonical' && <span className="chip chip-native">Native bridge</span>}
          </span>
        </span>
        <span className="route-amt">
          <TokenImage token={destination} size={36} />
          <span className="route-amt-text">
            <span>
              <span className="route-num">{amountText(route.amountOut, destination)}</span>{' '}
              <span className="route-sym">{destination.symbol}</span>
            </span>
            <span className="route-usd">
              {usd(
                prices[tokenKey(destination)] === undefined
                  ? undefined
                  : Number(utils.formatUnits(route.amountOut, destination.decimals)) *
                      (prices[tokenKey(destination)] ?? 0),
              )}
            </span>
          </span>
        </span>
        <span className="route-meta">
          <RouteVia route={route} />
          <span className="route-stats">
            <span title="Estimated total network and provider cost">{usd(gasUsd)}</span>
            <span>{duration(route.durationMs)}</span>
          </span>
        </span>
      </button>
      <button
        className="route-more"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <span>
          {route.kind !== 'lifi' && route.withdrawal
            ? 'Claim required on destination'
            : 'Route details'}
        </span>
        <span className="route-more-right">
          {expanded ? 'Hide' : 'Show'} <Icon name="down" size={14} />
        </span>
      </button>
      {expanded && (
        <ol className="steps">
          {route.kind === 'lifi' ? (
            route.quote.protocolData.route.steps.map((step) => (
              <li key={step.id}>
                <Icon name="swap" size={16} />
                <span>
                  <b>{step.toolDetails.name}</b>
                  <span>
                    {step.action.fromToken.symbol} on {chainName(step.action.fromChainId)} →{' '}
                    {step.action.toToken.symbol} on {chainName(step.action.toChainId)}
                  </span>
                </span>
              </li>
            ))
          ) : (
            <li>
              <Icon name="swap" size={16} />
              <span>
                <b>{route.name}</b>
                <span>
                  {route.withdrawal
                    ? 'Submit withdrawal, wait for confirmation, then claim.'
                    : 'Send on source; receive on destination.'}
                </span>
              </span>
            </li>
          )}
          {[...route.gas, ...route.fee]
            .filter((cost) => cost.amount !== '0')
            .map((cost) => (
              <li key={cost.details.id}>
                <Icon name="gas" size={16} />
                <span>
                  <b>{cost.details.label}</b>
                  <span>
                    {quantity(utils.formatUnits(cost.amount, cost.token.decimals))}{' '}
                    {cost.token.symbol}
                  </span>
                </span>
              </li>
            ))}
          {route.estimateError && <li className="steps-note">{route.estimateError}</li>}
        </ol>
      )}
    </article>
  );
}

function ReviewLegs({ request, route }: { request: QuoteRequest; route: DemoRoute }) {
  return (
    <div className="rv-legs">
      <div className="rv-leg">
        <TokenImage token={request.source} size={44} />
        <div className="rv-leg-text">
          <span className="rv-leg-label">You send</span>
          <span className="rv-leg-amt">
            {amountText(request.amount, request.source)} {request.source.symbol}
          </span>
          <span className="rv-leg-sub">on {chainName(request.source.chainId)}</span>
        </div>
      </div>
      <div className="rv-arrow">
        <span className="rv-arrow-line" />
        <span className="rv-arrow-ic">
          <Icon name="down" size={12} />
        </span>
        <span className="rv-arrow-via">
          <RouteVia route={route} />
        </span>
      </div>
      <div className="rv-leg">
        <TokenImage token={request.destination} size={44} />
        <div className="rv-leg-text">
          <span className="rv-leg-label">You receive</span>
          <span className="rv-leg-amt">
            {amountText(route.amountOut, request.destination)} {request.destination.symbol}
          </span>
          <span className="rv-leg-sub">on {chainName(request.destination.chainId)}</span>
        </div>
      </div>
    </div>
  );
}

const phaseLabel: Record<DemoTransfer['phase'], string> = {
  signing: 'Confirm in your wallet',
  approving: 'Approve in your wallet',
  submitted: 'Transaction submitted',
  bridging: 'Transfer in progress',
  claimable: 'Ready to claim',
  claiming: 'Claiming transfer',
  done: 'Transfer complete',
  error: 'Transfer needs attention',
};

export function DemoBridge({
  source,
  destination,
  balances,
  prices,
  picker,
  pickerOpen,
  onClosePicker,
  onOpenSource,
  onOpenDestination,
  onIntent,
  onReverse,
  notice,
  inspection,
  balancesLoading,
  balanceFailed,
}: {
  source?: TopToken;
  destination?: TopToken;
  balances: Map<string, string>;
  prices: Record<string, number>;
  picker: ReactNode;
  pickerOpen: boolean;
  onClosePicker: () => void;
  onOpenSource: () => void;
  onOpenDestination: () => void;
  onIntent: () => void;
  onReverse: () => void;
  notice: ReactNode;
  inspection: ReactNode;
  balancesLoading: boolean;
  balanceFailed: boolean;
}) {
  const { address } = useAccount();
  const [view, setView] = useState<'form' | 'review' | 'progress' | 'txns'>('form');
  const [modal, setModal] = useState<'notes' | null>(null);
  const [amount, setAmount] = useState('');
  const [recipientEnabled, setRecipientEnabled] = useState(false);
  const [recipient, setRecipient] = useState('');
  const [slippage, setSlippage] = useState('auto');
  const [priority, setPriority] = useState<'return' | 'speed'>('return');
  const [selectedId, setSelectedId] = useState<string>();
  const [showRoutes, setShowRoutes] = useState(false);
  const [review, setReview] = useState<{ request: QuoteRequest; route: DemoRoute }>();
  const [activeId, setActiveId] = useState<string>();
  const [error, setError] = useState('');
  const [settingMax, setSettingMax] = useState(false);
  const amountInput = useRef<HTMLInputElement>(null);
  const { transfers, start, claim, resume } = useDemoTransfers();
  const amountRaw = source ? parseAmount(amount, source.decimals) : undefined;
  const debouncedAmount = useDebounce(amountRaw, 350);
  const recipientValid = !recipientEnabled || isAddress(recipient);
  const effectiveSlippage = slippage === 'auto' ? '0.5' : slippage;
  const slippageValid = Number(effectiveSlippage) > 0 && Number(effectiveSlippage) <= 50;
  const request: QuoteRequest | undefined =
    source &&
    destination &&
    debouncedAmount &&
    amountRaw === debouncedAmount &&
    recipientValid &&
    slippageValid
      ? {
          source,
          destination,
          amount: debouncedAmount,
          sender: address,
          recipient: recipientEnabled ? recipient : address,
          slippage: effectiveSlippage,
        }
      : undefined;
  const {
    data: quotes,
    error: quoteError,
    isLoading: quoting,
    mutate: refreshQuotes,
  } = useSWR(request ? (['demo-routes', request] as const) : null, fetchRoutes, {
    refreshInterval: view === 'form' && !pickerOpen ? 30_000 : 0,
    keepPreviousData: false,
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });
  const routes = [...(quotes?.routes ?? [])].sort((a, b) =>
    priority === 'speed'
      ? (a.durationMs ?? Infinity) - (b.durationMs ?? Infinity)
      : BigNumber.from(a.amountOut).eq(b.amountOut)
        ? (costUsd([...a.gas, ...a.fee], prices) ?? Infinity) -
          (costUsd([...b.gas, ...b.fee], prices) ?? Infinity)
        : BigNumber.from(a.amountOut).gt(b.amountOut)
          ? -1
          : 1,
  );
  const selected = routes.find((route) => route.id === selectedId) ?? routes[0];
  const best = [...routes].sort((a, b) =>
    BigNumber.from(a.amountOut).eq(b.amountOut)
      ? 0
      : BigNumber.from(a.amountOut).gt(b.amountOut)
        ? -1
        : 1,
  )[0];
  const fastest = [...routes]
    .filter((route) => route.durationMs !== undefined)
    .sort((a, b) => (a.durationMs ?? Infinity) - (b.durationMs ?? Infinity))[0];
  const sourceBalance = source ? balances.get(tokenKey(source)) : undefined;
  const insufficient =
    sourceBalance !== undefined &&
    amountRaw !== undefined &&
    BigNumber.from(amountRaw).gt(sourceBalance);
  const active = transfers.find((tx) => tx.id === activeId);
  const selectionIdentity = `${source && tokenKey(source)}-${destination && tokenKey(destination)}`;
  const maxContext = useRef('');
  useEffect(() => {
    maxContext.current = `${selectionIdentity}:${address}:${recipientEnabled}:${recipient}:${amount}`;
  }, [selectionIdentity, address, recipientEnabled, recipient, amount]);
  useEffect(() => {
    setView('form');
    setSelectedId(undefined);
    setError('');
  }, [selectionIdentity]);
  const pickerWasOpen = useRef(false);
  useEffect(() => {
    if (pickerWasOpen.current && !pickerOpen && view === 'form')
      amountInput.current?.focus({ preventScroll: true });
    pickerWasOpen.current = pickerOpen;
  }, [pickerOpen, view]);
  const sourceIdentity = source && tokenKey(source);
  useEffect(() => {
    setAmount('');
  }, [sourceIdentity]);

  function navigate(next: 'form' | 'txns') {
    onClosePicker();
    setView(next);
    setError('');
  }
  async function percentage(percent: number) {
    if (!source || !destination || sourceBalance === undefined || settingMax) return;
    if (percent !== 100) {
      setAmount(
        utils.formatUnits(BigNumber.from(sourceBalance).mul(percent).div(100), source.decimals),
      );
      return;
    }
    setSettingMax(true);
    setError('');
    const context = maxContext.current;
    try {
      const cap = isNovaDestination(destination.chainId)
        ? utils.parseEther(String(NOVA_MAX_ETH_DEPOSIT_AMOUNT))
        : undefined;
      const halfBalance = BigNumber.from(sourceBalance).div(2);
      const half = cap && halfBalance.gt(cap) ? cap : halfBalance;
      const probe =
        selected && !selected.estimateError
          ? selected
          : (
              await fetchRoutes([
                'demo-max',
                {
                  source,
                  destination,
                  amount: half.gt(0) ? half.toString() : sourceBalance,
                  sender: address,
                  recipient: recipientEnabled ? recipient : address,
                  slippage: effectiveSlippage,
                },
              ])
            ).routes.find((route) => !route.estimateError);
      if (!probe) throw new Error('Could not estimate fees for Max. Enter an amount or try again.');
      const sourcePays = (cost: DemoRoute['gas'][number]) =>
        (cost.chainId === source.chainId && cost.token.address.toLowerCase() === source.address) ||
        (probe.kind === 'canonical' &&
          !probe.withdrawal &&
          destination.address === NATIVE_TOKEN_ADDRESS &&
          cost.chainId === destination.chainId);
      const inSourceUnits = (cost: DemoRoute['gas'][number]) =>
        utils
          .parseUnits(utils.formatUnits(cost.amount, cost.token.decimals), source.decimals)
          .toString();
      const max = spendableBalance({
        balance: sourceBalance,
        gas: probe.gas.filter(sourcePays).map(inSourceUnits),
        fee: probe.fee.filter(sourcePays).map(inSourceUnits),
      });
      if (context === maxContext.current)
        setAmount(utils.formatUnits(cap && cap.lt(max) ? cap : max, source.decimals));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not calculate Max.');
    } finally {
      setSettingMax(false);
    }
  }
  const routeCards = destination && (
    <div className="route-list">
      {routes.map((route) => (
        <RouteCard
          key={route.id}
          route={route}
          destination={destination}
          selected={selected?.id === route.id}
          onSelect={() => setSelectedId(route.id)}
          prices={prices}
          best={best?.id === route.id}
          fastest={fastest?.id === route.id}
        />
      ))}
    </div>
  );
  const isQuoting = quoting || amountRaw !== debouncedAmount;
  const canReview = Boolean(
    address &&
      request &&
      selected &&
      !insufficient &&
      !isQuoting &&
      !selected.estimateError &&
      sourceBalance !== undefined &&
      !balancesLoading &&
      !balanceFailed,
  );
  const cta = !address
    ? 'Connect Wallet'
    : !amountRaw
      ? 'Enter an amount'
      : !recipientValid
        ? 'Enter a valid receiving address'
        : insufficient
          ? 'Insufficient balance'
          : isQuoting
            ? 'Finding routes…'
            : selected?.estimateError
              ? 'Retry network estimate'
              : !selected
                ? 'No routes found'
                : balancesLoading
                  ? 'Loading balance…'
                  : balanceFailed
                    ? 'Balance unavailable'
                    : 'Review bridge';
  const form = (
    <div className="card">
      <header className="card-head">
        <h1>
          {source && destination && source.chainId === destination.chainId ? 'Swap' : 'Bridge'}
        </h1>
        <div className="card-tools">
          {(selected || isQuoting) && (
            <button
              className="iconbtn narrow-refresh"
              aria-label="Refresh quotes"
              onClick={() => void refreshQuotes()}
            >
              {isQuoting ? <Spinner /> : <Icon name="clock" />}
            </button>
          )}
          <Popover className="pop-anchor">
            <PopoverButton className="iconbtn" aria-label="Bridge settings">
              <Icon name="settings" size={19} />
            </PopoverButton>
            <PopoverPanel className="pop pop-settings">
              <div className="pop-title">Settings</div>
              <div className="set-row">
                <div>
                  <div className="set-name">Route priority</div>
                  <div className="set-hint">Which route is selected first</div>
                </div>
                <div className="seg" role="radiogroup" aria-label="Route priority">
                  {(['return', 'speed'] as const).map((value) => (
                    <button
                      key={value}
                      role="radio"
                      aria-checked={priority === value}
                      className={priority === value ? 'is-on' : ''}
                      onClick={() => {
                        setPriority(value);
                        setSelectedId(undefined);
                      }}
                    >
                      {value === 'return' ? 'Best return' : 'Fastest'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="set-row">
                <div>
                  <div className="set-name">Max slippage</div>
                  <div className="set-hint">Applies to routes that swap</div>
                </div>
                <div className="seg" role="radiogroup" aria-label="Max slippage">
                  {['auto', '0.1', '0.5', '1'].map((value) => (
                    <button
                      key={value}
                      role="radio"
                      aria-checked={slippage === value}
                      className={slippage === value ? 'is-on' : ''}
                      onClick={() => setSlippage(value)}
                    >
                      {value === 'auto' ? 'Auto' : `${value}%`}
                    </button>
                  ))}
                </div>
              </div>
            </PopoverPanel>
          </Popover>
        </div>
      </header>
      <div className="legs">
        <section className={`leg${insufficient ? ' is-error' : ''}`}>
          <div className="leg-top">
            <span className="leg-label">From</span>
            {sourceBalance !== undefined && BigNumber.from(sourceBalance).gt(0) && (
              <span className="pcts">
                {[25, 50, 100].map((percent) => (
                  <button
                    key={percent}
                    disabled={settingMax}
                    onClick={() => void percentage(percent)}
                  >
                    {percent === 100 ? 'Max' : `${percent}%`}
                  </button>
                ))}
              </span>
            )}
          </div>
          <div className="leg-mid">
            <input
              ref={amountInput}
              className="amount"
              style={{ fontSize: amount.length > 12 ? 24 : 36 }}
              aria-label="Amount to send"
              value={amount}
              inputMode="decimal"
              placeholder="0"
              onChange={(event) => {
                if (/^\d*(\.\d*)?$/.test(event.target.value)) setAmount(event.target.value);
              }}
            />
            <AssetButton token={source} side="source" onClick={onOpenSource} onIntent={onIntent} />
          </div>
          <div className="leg-bot">
            <span className="leg-usd">
              {usd(
                source && prices[tokenKey(source)] !== undefined
                  ? Number(amount || 0) * (prices[tokenKey(source)] ?? 0)
                  : undefined,
              )}
            </span>
            <span className="leg-bal" hidden={!address}>
              Balance:{' '}
              {source && sourceBalance !== undefined ? amountText(sourceBalance, source) : '—'}
            </span>
          </div>
        </section>
        <button
          className="flip"
          aria-label="Reverse source and destination"
          disabled={!source || !destination}
          onClick={() => {
            setAmount('');
            onReverse();
          }}
        >
          <Icon name="swap" size={16} />
        </button>
        <section className="leg">
          <div className="leg-top">
            <span className="leg-label">To</span>
            {selected && (
              <span className="leg-eta">
                <Icon name="clock" size={13} />
                {duration(selected.durationMs)}
              </span>
            )}
          </div>
          <div className="leg-mid">
            <div
              className={`amount amount-out${!selected ? ' is-empty' : ''}`}
              style={{ fontSize: 36 }}
            >
              {isQuoting ? (
                <span className="skel" style={{ width: 100, height: 32 }} />
              ) : selected && destination ? (
                amountText(selected.amountOut, destination)
              ) : (
                '0'
              )}
            </div>
            <AssetButton token={destination} side="destination" onClick={onOpenDestination} />
          </div>
          <div className="leg-bot">
            <span className="leg-usd">
              {usd(
                selected && destination && prices[tokenKey(destination)] !== undefined
                  ? Number(utils.formatUnits(selected.amountOut, destination.decimals)) *
                      (prices[tokenKey(destination)] ?? 0)
                  : undefined,
              )}
            </span>
            <span className="leg-bal" hidden={!address}>
              Balance:{' '}
              {destination && balances.has(tokenKey(destination))
                ? amountText(balances.get(tokenKey(destination)) ?? '0', destination)
                : '—'}
            </span>
          </div>
          {recipientEnabled && (
            <div className="recipient">
              <div className="recipient-head">
                <span>Receiving wallet</span>
                <button
                  className="mini"
                  aria-label="Remove custom recipient"
                  onClick={() => setRecipientEnabled(false)}
                >
                  <Icon name="close" size={14} />
                </button>
              </div>
              <div className="recipient-edit">
                <input
                  aria-label="Receiving wallet address"
                  value={recipient}
                  onChange={(event) => setRecipient(event.target.value)}
                  placeholder="0x…"
                />
                <button
                  className="btn btn-ghost btn-sm"
                  disabled={!address}
                  onClick={() => setRecipient(address ?? '')}
                >
                  My wallet
                </button>
              </div>
              {recipient && !recipientValid && (
                <p className="picker-message" role="alert">
                  Enter a valid EVM address.
                </p>
              )}
            </div>
          )}
        </section>
      </div>
      {notice}
      {error && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}
      {source?.isImported || destination?.isImported ? (
        <p className="notice">
          This token was imported by address. Verify its contract before transferring.
        </p>
      ) : null}
      {selected && selected.kind !== 'lifi' && selected.withdrawal && (
        <p className="notice">
          Native withdrawals require a confirmation period and a claim on{' '}
          {destination && chainName(destination.chainId)}.
        </p>
      )}
      {(isQuoting || selected) && (
        <div className="summary">
          <button className="summary-row" onClick={() => setShowRoutes(!showRoutes)}>
            {selected ? (
              <>
                <RouteVia route={selected} />
                <span className="summary-stats">
                  <span>
                    {usd(
                      selected.estimateError
                        ? undefined
                        : costUsd([...selected.gas, ...selected.fee], prices),
                    )}
                  </span>
                  <span>{duration(selected.durationMs)}</span>
                </span>
                <span className="summary-more">
                  {routes.length} route{routes.length === 1 ? '' : 's'}{' '}
                  <Icon name="down" size={14} />
                </span>
              </>
            ) : (
              <span className="summary-loading">
                <Spinner />
                Finding routes…
              </span>
            )}
          </button>
          {showRoutes && <div className="inline-routes">{routeCards}</div>}
        </div>
      )}
      {Boolean(quoteError || quotes?.errors.length) && (
        <p className="notice" role="status">
          {quoteError instanceof Error ? quoteError.message : quotes?.errors.join(' ')}{' '}
          <button className="linkbtn" onClick={() => void refreshQuotes()}>
            Retry
          </button>
        </p>
      )}
      {selected?.estimateError && (
        <p className="notice" role="status">
          {selected.estimateError}
        </p>
      )}
      <div className="cta-row">
        <button
          className="cta"
          disabled={Boolean(address) && !canReview && !selected?.estimateError}
          onClick={() => {
            if (!address) return connect();
            if (selected?.estimateError) {
              void refreshQuotes();
              return;
            }
            if (request && selected && canReview) {
              setReview({ request, route: selected });
              setView('review');
            }
          }}
        >
          {isQuoting && <Spinner />}
          {cta}
        </button>
        {address && (
          <button
            className={`cta-side${recipientEnabled ? ' is-on' : ''}`}
            aria-label="Send to a different wallet"
            title="Send to a different wallet"
            onClick={() => setRecipientEnabled(!recipientEnabled)}
          >
            <Icon name="user" size={20} />
          </button>
        )}
      </div>
      <p className="terms">
        By continuing you agree to the{' '}
        <a href="https://arbitrum.io/tos" target="_blank" rel="noreferrer">
          Terms and Conditions
        </a>
        .
      </p>
    </div>
  );

  return (
    <div className="bridge-demo has-bar">
      <div className="pubbar">
        <b>Technical prototype.</b> Live data and real wallet transactions.{' '}
        <a href="https://portal.arbitrum.io/bridge" target="_blank" rel="noreferrer">
          Go to the live bridge
        </a>
      </div>
      <nav className="nav" aria-label="Arbitrum Portal">
        <div className="nav-left">
          <span className="nav-tile">
            <DemoImage name="arbitrum-logo" size={24} />
          </span>
          <span className="nav-tile nav-search">
            <Icon name="search" />
          </span>
          <button className="nav-proto" onClick={() => setModal('notes')}>
            Prototype
          </button>
        </div>
        <div className="nav-links">
          <span className="nav-link">Home</span>
          <span className="nav-link is-on">Bridge</span>
          <span className="nav-link is-featured">Earn ✦</span>
          <span className="nav-link">Explore</span>
          <span className="nav-link">Build</span>
        </div>
        <div className="nav-right">
          <button
            className={address ? 'acct' : 'btn btn-primary'}
            onClick={() => (address ? void appKit.open({ view: 'Account' }) : connect())}
          >
            {address ? (
              <>
                <span className="acct-ava acct-evm" />
                {shortAddress(address)}
                <Icon name="down" size={14} />
              </>
            ) : (
              'Connect Wallet'
            )}
          </button>
        </div>
      </nav>
      <aside className="subnav" aria-label="Bridge sections">
        <button className={view !== 'txns' ? 'is-on' : ''} onClick={() => navigate('form')}>
          <DemoImage name="bridge" />
          <span>Bridge</span>
        </button>
        <button className={view === 'txns' ? 'is-on' : ''} onClick={() => navigate('txns')}>
          <span className="subnav-ic">
            <DemoImage name="transactions" />
            {transfers.some((tx) => tx.phase !== 'done' && tx.phase !== 'error') && (
              <i className="subnav-badge">
                {transfers.filter((tx) => tx.phase !== 'done' && tx.phase !== 'error').length}
              </i>
            )}
          </span>
          <span>Txns</span>
        </button>
        <button className="is-static" disabled>
          <DemoImage name="buy" />
          <span>Buy</span>
        </button>
      </aside>
      <main className="main">
        <div className={`stage stage-${pickerOpen ? 'picker' : view}`}>
          <div
            className={`widget${pickerOpen ? ' widget-picker' : view === 'txns' ? ' widget-txns' : ''}`}
          >
            {pickerOpen ? (
              picker
            ) : view === 'form' ? (
              form
            ) : view === 'review' && review ? (
              <div className="card card-review">
                <header className="card-head">
                  <button
                    className="iconbtn"
                    aria-label="Back to bridge"
                    onClick={() => setView('form')}
                  >
                    <Icon name="back" />
                  </button>
                  <h1>Review bridge</h1>
                  <span />
                </header>
                <ReviewLegs {...review} />
                <dl className="rv-list">
                  <div>
                    <dt>Network cost</dt>
                    <dd>{usd(costUsd(review.route.gas, prices))}</dd>
                  </div>
                  <div>
                    <dt>Provider fee</dt>
                    <dd>{usd(costUsd(review.route.fee, prices))}</dd>
                  </div>
                  <div>
                    <dt>Minimum received</dt>
                    <dd>
                      {amountText(review.route.minimumOut, review.request.destination)}{' '}
                      {review.request.destination.symbol}
                    </dd>
                  </div>
                  <div>
                    <dt>Estimated arrival</dt>
                    <dd>{duration(review.route.durationMs)}</dd>
                  </div>
                  <div>
                    <dt>Receiving wallet</dt>
                    <dd title={review.request.recipient}>
                      {review.request.recipient && shortAddress(review.request.recipient)}
                    </dd>
                  </div>
                </dl>
                {review.route.kind !== 'lifi' && review.route.withdrawal && (
                  <p className="notice">
                    A second transaction is required to claim after the confirmation period.
                  </p>
                )}
                <button
                  className="cta"
                  onClick={async () => {
                    setError('');
                    try {
                      await start(review.request, review.route, (id) => {
                        setActiveId(id);
                        setView('progress');
                      });
                    } catch (error) {
                      setError(
                        error instanceof Error ? error.message : 'Could not start transfer.',
                      );
                    }
                  }}
                >
                  Confirm bridge
                </button>
                <p className="terms">
                  Your wallet will request approval if needed, then confirmation of the transfer.
                </p>
                {error && (
                  <p className="notice" role="alert">
                    {error}
                  </p>
                )}
              </div>
            ) : view === 'progress' && active ? (
              <div className="card">
                <header className="card-head">
                  <button
                    className="iconbtn"
                    aria-label="Back to transactions"
                    onClick={() => setView('txns')}
                  >
                    <Icon name="back" />
                  </button>
                  <h1>Bridge</h1>
                  <span />
                </header>
                <div className={`hero hero-${active.phase === 'done' ? 'done' : 'pending'}`}>
                  <span className="hero-badge">
                    {active.phase === 'done' ? (
                      <Icon name="check" size={28} />
                    ) : active.phase === 'error' || active.phase === 'claimable' ? (
                      <Icon name="info" size={28} />
                    ) : (
                      <Spinner size={28} />
                    )}
                  </span>
                  <h2>{phaseLabel[active.phase]}</h2>
                  <p>
                    {active.phase === 'done'
                      ? `Received on ${chainName(active.request.destination.chainId)}`
                      : active.phase === 'signing' || active.phase === 'approving'
                        ? 'Check your wallet to continue.'
                        : 'You can follow this transfer in Txns.'}
                  </p>
                </div>
                <div className={`track${active.phase === 'done' ? ' track-done' : ''}`}>
                  <div className="track-end">
                    <TokenImage token={active.request.source} size={40} />
                    {chainName(active.request.source.chainId)}
                  </div>
                  <div className="track-line">
                    <span
                      className="track-fill"
                      style={{
                        width: active.phase === 'done' ? '100%' : active.hash ? '50%' : '0%',
                      }}
                    />
                  </div>
                  <div className="track-end">
                    <TokenImage token={active.request.destination} size={40} />
                    {chainName(active.request.destination.chainId)}
                  </div>
                </div>
                <div className="timeline">
                  {['Confirm in wallet', 'Source transaction', 'Receive on destination'].map(
                    (label, index) => {
                      const done =
                        active.phase === 'done' ||
                        (index === 0 && Boolean(active.hash)) ||
                        (index === 1 &&
                          ['bridging', 'claimable', 'claiming'].includes(active.phase));
                      const currentStep = !active.hash ? 0 : active.phase === 'submitted' ? 1 : 2;
                      return (
                        <div
                          key={label}
                          className={`tl ${done ? 'tl-done' : index === currentStep ? 'tl-active' : ''}`}
                        >
                          <span className="tl-dot">{done && <Icon name="check" size={12} />}</span>
                          <div className="tl-text">
                            <b>{label}</b>
                            {index === 1 && active.hash && (
                              <a
                                href={`${getExplorerUrl(active.request.source.chainId)}/tx/${active.hash}`}
                                target="_blank"
                                rel="noreferrer"
                              >
                                {shortAddress(active.hash)} ↗
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    },
                  )}
                </div>
                {active.error && (
                  <p className="notice" role="alert">
                    {active.error}
                  </p>
                )}
                {active.trackingError && (
                  <p className="notice" role="status">
                    {active.trackingError}
                  </p>
                )}
                {active.phase === 'claimable' && (
                  <button className="cta" onClick={() => void claim(active)}>
                    Claim transfer
                  </button>
                )}
                {active.phase === 'error' && active.lifiRoute && (
                  <button className="cta" onClick={() => void resume(active)}>
                    Resume transfer
                  </button>
                )}
                <button className="cta" onClick={() => setView('txns')}>
                  View transactions
                </button>
                <button className="btn btn-ghost btn-block" onClick={() => setView('form')}>
                  Back to bridge
                </button>
              </div>
            ) : (
              <div className="card">
                <header className="card-head">
                  <h1>Transactions</h1>
                  <span className="muted">This session</span>
                </header>
                {transfers.length ? (
                  <div className="txlist">
                    {transfers.map((tx) => (
                      <button
                        key={tx.id}
                        className="tx"
                        onClick={() => {
                          setActiveId(tx.id);
                          setView('progress');
                        }}
                      >
                        <span className="tx-icons">
                          <TokenImage token={tx.request.source} size={32} />
                          <TokenImage token={tx.request.destination} size={32} />
                        </span>
                        <span className="tx-text">
                          <b>
                            {amountText(tx.request.amount, tx.request.source)}{' '}
                            {tx.request.source.symbol} → {tx.request.destination.symbol}
                          </b>
                          <span>
                            {chainName(tx.request.source.chainId)} →{' '}
                            {chainName(tx.request.destination.chainId)} ·{' '}
                            {new Date(tx.createdAt).toLocaleTimeString()}
                          </span>
                        </span>
                        <span
                          className={`chip tx-status tx-${tx.phase === 'done' ? 'done' : 'pending'}`}
                        >
                          {tx.phase === 'done'
                            ? 'Complete'
                            : tx.phase === 'error'
                              ? 'Attention'
                              : 'Pending'}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="empty empty-txns">
                    <Icon name="clock" size={32} />
                    <b>No transactions yet</b>
                    <span>Your transfers will appear here.</span>
                    <button className="btn btn-primary" onClick={() => setView('form')}>
                      Start bridging
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          <aside
            inert={pickerOpen || view !== 'form' || !(routes.length || isQuoting)}
            aria-hidden={pickerOpen || view !== 'form' || !(routes.length || isQuoting)}
            className={`routes-slot${!pickerOpen && view === 'form' && (routes.length || isQuoting) ? ' is-open' : ''}`}
          >
            <div className="routes">
              <header className="routes-head">
                <h2>Routes</h2>
                <button
                  className="iconbtn"
                  aria-label="Refresh routes"
                  onClick={() => void refreshQuotes()}
                >
                  <Icon name="clock" size={16} />
                </button>
              </header>
              {isQuoting ? (
                <div className="route route-skel">
                  <Spinner />
                  Finding routes…
                </div>
              ) : (
                routeCards
              )}
            </div>
          </aside>
        </div>
        {pickerOpen && <div className="picker-scrim" onClick={onClosePicker} />}
        <div className="protobar">
          <button onClick={() => setModal('notes')}>
            <Icon name="info" size={14} />
            Prototype notes
          </button>
          <span className="protobar-sep" />
          <button
            onClick={() => {
              setAmount('');
              setRecipient('');
              setRecipientEnabled(false);
              navigate('form');
            }}
          >
            Reset form
          </button>
        </div>
      </main>
      <Dialog open={modal !== null} onClose={() => setModal(null)} className="bridge-demo">
        <div className="scrim">
          <DialogPanel className={`modal${modal === 'notes' ? ' modal-notes' : ''}`}>
            <header className="modal-head">
              <DialogTitle>Prototype</DialogTitle>
              <button className="iconbtn" aria-label="Close" onClick={() => setModal(null)}>
                <Icon name="close" />
              </button>
            </header>
            <div className="notes">
              <p>
                Demo interface connected to the published token registry, wallet balances, live
                quotes, and bridge SDK. Transfers require your wallet confirmation. History contains
                transfers started in this page session.
              </p>
              {inspection}
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </div>
  );
}

function DemoImage({ name, size = 22 }: { name: string; size?: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`/token-registry-poc/demo/ui-${name}.svg`} alt="" width={size} height={size} />;
}
