'use client';

import { useDebounce } from '@uidotdev/usehooks';
import { useEffect, useId, useRef, useState } from 'react';
import { AutoSizer, List, ListRowProps } from 'react-virtualized';
import useSWR from 'swr';
import { formatUnits } from 'viem';

import {
  DestinationOption,
  NetworkReach,
  RegistryIndexFile,
  TokenList,
  TopFile,
  TopToken,
  getNetworkSuggestions,
  getTokenComparator,
  mergePickerTokens,
  removeNetworkQuery,
  searchTokens,
  tokenKey,
} from '@/app/src/token-registry/registryFiles';
import { NATIVE_TOKEN_ADDRESS, ProviderId } from '@/app/src/token-registry/types';
import { getAccountExplorerUrl } from '@/bridge/util/networks';

import {
  AllNetworks,
  ChainImage,
  Icon,
  Spinner,
  TokenImage,
  quantity,
  shortAddress,
  usd,
} from './DemoAtoms';

export type SwrKey = readonly [string, string];
type PickerToken = TopToken & Partial<Pick<DestinationOption, 'providers' | 'isCounterpart'>>;

export async function fetchJson<T>([url]: SwrKey): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  return response.json();
}

const NETWORK_REACH_TITLES: Record<NetworkReach, string | undefined> = {
  sameAsset: undefined,
  swap: 'The source reaches this network only by swapping to another token.',
  none: 'The source does not reach this network. Picking a token here changes the source.',
};

type PickerRow<T> = { kind: 'header'; label: string } | { kind: 'token'; token: T };

export function TokenPicker<T extends PickerToken>({
  title,
  chains,
  initialChainId,
  selectedToken,
  balances,
  localTokens,
  extraTokens,
  recents,
  top,
  getProviders,
  getNetworkReach,
  getSearchKey,
  onSelect,
  onClose,
  description,
  selectionStatus,
  selectionError,
  onFilterChange,
  prices = {},
  failedBalanceChainIds = [],
}: {
  title: string;
  chains: RegistryIndexFile['chains'];
  initialChainId: number | null;
  selectedToken?: T;
  balances: Map<string, string>;
  localTokens: T[];
  extraTokens: T[];
  recents: T[];
  top?: TopFile;
  // In the destination picker: the providers that reach a token. A token without any changes the
  // source when the user picks it.
  getProviders?: (token: T) => ProviderId[] | undefined;
  // In the destination picker: how the source reaches each network. Picking a token on a network
  // that it does not reach changes the source.
  getNetworkReach?: (chainId: number) => NetworkReach;
  getSearchKey: (chainId: number | null, query: string) => SwrKey | null;
  onSelect: (token: T) => void;
  onClose: () => void;
  description?: string;
  selectionStatus?: string;
  selectionError?: string;
  onFilterChange: (chainId: number | null) => void;
  prices?: Record<string, number>;
  failedBalanceChainIds?: number[];
}) {
  const [chainId, setChainId] = useState(initialChainId);
  const [query, setQuery] = useState('');
  const [networkQuery, setNetworkQuery] = useState('');
  const [activeKey, setActiveKey] = useState<string>();
  const [copyStatus, setCopyStatus] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<List>(null);
  const id = useId();
  useEffect(() => {
    input.current?.focus();
  }, []);
  const debouncedQuery = useDebounce(query.trim(), 250);
  const chainName = (id: number) =>
    chains.find((chain) => chain.chainId === id)?.name ?? String(id);
  const options = { revalidateOnFocus: false, keepPreviousData: false };
  const searchKey = debouncedQuery ? getSearchKey(chainId, debouncedQuery) : null;
  const {
    data: matches,
    error: searchError,
    isLoading: searching,
    mutate: retrySearch,
  } = useSWR(searchKey, fetchJson<TokenList<T>>, options);
  const currentMatches = query.trim() === debouncedQuery ? matches : undefined;
  const sort = (tokens: T[]) => {
    const ranked = top ? [...tokens].sort(getTokenComparator(top)) : tokens;
    const matched = query.trim() ? searchTokens(ranked, query, chains) : ranked;
    return [
      ...matched.filter((token) => balances.has(tokenKey(token))),
      ...matched.filter((token) => !balances.has(tokenKey(token))),
    ];
  };
  const available = mergePickerTokens(extraTokens, currentMatches?.tokens ?? [], localTokens);
  const mainTokens = sort(
    available.filter((token) => chainId === null || token.chainId === chainId),
  );
  const otherTokens =
    chainId !== null && query.trim()
      ? sort(
          // The loaded lists only: the other networks' top tokens are enough for eight suggestions.
          mergePickerTokens(extraTokens, localTokens).filter((token) => token.chainId !== chainId),
        ).slice(0, 8)
      : [];
  const suggestions = getNetworkSuggestions(query, chains);
  const rows: PickerRow<T>[] = [
    ...(query.trim()
      ? [
          { kind: 'header' as const, label: `Results · ${mainTokens.length}` },
          ...mainTokens.map((token): PickerRow<T> => ({ kind: 'token', token })),
        ]
      : [
          ...(mainTokens.some((token) => balances.has(tokenKey(token)))
            ? [
                { kind: 'header' as const, label: 'In your wallet' },
                ...mainTokens
                  .filter((token) => balances.has(tokenKey(token)))
                  .map((token): PickerRow<T> => ({ kind: 'token', token })),
              ]
            : []),
          {
            kind: 'header' as const,
            label: chainId === null ? 'Top tokens across networks' : 'All tokens',
          },
          ...mainTokens
            .filter((token) => !balances.has(tokenKey(token)))
            .map((token): PickerRow<T> => ({ kind: 'token', token })),
        ]),
    ...(otherTokens.length
      ? [
          { kind: 'header' as const, label: 'On other networks' },
          ...otherTokens.map((token): PickerRow<T> => ({ kind: 'token', token })),
        ]
      : []),
  ];
  const tokens = [...mainTokens, ...otherTokens];
  const highlighted =
    tokens.find((token) => tokenKey(token) === activeKey) ?? (query.trim() ? tokens[0] : undefined);
  const highlightedIndex = highlighted
    ? rows.findIndex((row) => row.kind === 'token' && tokenKey(row.token) === tokenKey(highlighted))
    : -1;
  const optionId = (token: T) => `${id}-${tokenKey(token)}`;
  const isBusy = searching || query.trim() !== debouncedQuery;
  const hasError = Boolean(searchError);
  const incomplete = currentMatches?.isComplete === false;
  const recentTokens = recents.slice(0, 4);

  function changeFilter(next: number | null, consume = false) {
    setChainId(next);
    onFilterChange(next);
    if (consume && next !== null) setQuery(removeNetworkQuery(query, chainName(next)));
    setActiveKey(undefined);
    list.current?.scrollToPosition(0);
    input.current?.focus();
  }

  const rowRenderer = ({ index, key, style }: ListRowProps) => {
    const row = rows[index];
    if (!row) return null;
    if (row.kind === 'header')
      return (
        <div key={key} style={style} className="lhead">
          <span>{row.label}</span>
        </div>
      );
    const { token } = row;
    const balance = balances.get(tokenKey(token));
    const amount =
      balance === undefined ? undefined : Number(formatUnits(BigInt(balance), token.decimals));
    const price = prices[tokenKey(token)];
    const active = highlighted && tokenKey(highlighted) === tokenKey(token);
    const selected = selectedToken && tokenKey(selectedToken) === tokenKey(token);
    return (
      <div key={key} style={style}>
        <div
          id={optionId(token)}
          role="option"
          aria-selected={Boolean(selected)}
          data-token-key={tokenKey(token)}
          onClick={() => onSelect(token)}
          onMouseMove={() => setActiveKey(tokenKey(token))}
          className={`trow${active ? ' is-active' : ''}${selected ? ' is-current' : ''}`}
        >
          <TokenImage key={tokenKey(token)} token={token} />
          <div className="trow-main">
            <div className="trow-top">
              <span className="trow-sym">{token.symbol}</span>
              {token.address === NATIVE_TOKEN_ADDRESS && (
                <span className="chip chip-quiet">Gas</span>
              )}
              {token.isCounterpart && <span className="chip chip-native">Same asset</span>}
              {token.isImported && <span className="chip chip-warn">Unverified</span>}
              {getProviders && !getProviders(token) && (
                <span className="chip chip-warn">Changes source</span>
              )}
              {selected && <Icon name="check" size={14} />}
            </div>
            <div className="trow-sub">
              <span className="trow-name">{token.name}</span>
              <span className="trow-chain"> · {chainName(token.chainId)}</span>
            </div>
            <div className="trow-addr">
              {token.address === NATIVE_TOKEN_ADDRESS ? (
                <span>Native asset · {chainName(token.chainId)}</span>
              ) : (
                <>
                  <span className="mono">{shortAddress(token.address)}</span>
                  <button
                    className="mini"
                    aria-label={`Copy ${token.symbol} address on ${chainName(token.chainId)}`}
                    onClick={async (event) => {
                      event.stopPropagation();
                      try {
                        await navigator.clipboard.writeText(token.address);
                        setCopyStatus('Address copied');
                      } catch {
                        setCopyStatus(`Copy unavailable. Address: ${token.address}`);
                      }
                    }}
                  >
                    <Icon name="copy" size={13} />
                  </button>
                  <a
                    className="mini"
                    href={getAccountExplorerUrl(token.chainId, token.address)}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(event) => event.stopPropagation()}
                    aria-label={`View ${token.symbol} on explorer`}
                  >
                    <Icon name="external" size={13} />
                  </a>
                </>
              )}
            </div>
          </div>
          {amount !== undefined && (
            <div className="trow-right">
              <span className="trow-bal">{quantity(amount)}</span>
              <span className="trow-usd">
                {usd(price === undefined ? undefined : amount * price)}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };
  const coreChainIds = [42161, 1, 4663, 42170];
  const networkGroups = [
    {
      label: 'Core chains',
      chains: coreChainIds.flatMap((id) => chains.filter((chain) => chain.chainId === id)),
    },
    {
      label: 'More networks',
      chains: chains.filter(
        (chain) => !coreChainIds.includes(chain.chainId) && !chain.parentChainId,
      ),
    },
    {
      label: 'Arbitrum chains',
      chains: chains.filter(
        (chain) => !coreChainIds.includes(chain.chainId) && chain.parentChainId,
      ),
    },
  ].map((group) => ({
    ...group,
    chains: group.chains.filter((chain) =>
      chain.name.toLowerCase().includes(networkQuery.toLowerCase()),
    ),
  }));
  function networkButton(chain: RegistryIndexFile['chains'][number] | null, mobile = false) {
    const selected = chainId === (chain?.chainId ?? null);
    const reach = chain ? getNetworkReach?.(chain.chainId) : undefined;
    const held = extraTokens.filter(
      (token) => balances.has(tokenKey(token)) && (!chain || token.chainId === chain.chainId),
    );
    const total =
      held.length &&
      !failedBalanceChainIds.some((id) => !chain || chain.chainId === id) &&
      held.every((token) => prices[tokenKey(token)] !== undefined)
        ? held.reduce(
            (sum, token) =>
              sum +
              Number(formatUnits(BigInt(balances.get(tokenKey(token)) ?? '0'), token.decimals)) *
                (prices[tokenKey(token)] ?? 0),
            0,
          )
        : undefined;
    return (
      <button
        key={chain?.chainId ?? 'all'}
        type="button"
        className={`${mobile ? 'netchip' : 'net'}${selected ? ' is-on' : ''}`}
        aria-pressed={selected}
        title={reach ? NETWORK_REACH_TITLES[reach] : undefined}
        onClick={() => changeFilter(chain?.chainId ?? null)}
      >
        {chain ? (
          <ChainImage chainId={chain.chainId} size={mobile ? 18 : 24} />
        ) : (
          <AllNetworks size={mobile ? 18 : 24} />
        )}
        <span className="net-name">{chain?.name ?? 'All networks'}</span>
        {!mobile && total !== undefined && <span className="net-val">{usd(total)}</span>}
        {reach === 'none' && (
          <span className="net-warn" aria-label="Changes source">
            <Icon name="warn" size={mobile ? 12 : 14} />
          </span>
        )}
        {reach === 'swap' && (
          <span className="net-swap" aria-label="Swap only">
            <Icon name="swap" size={mobile ? 12 : 14} />
          </span>
        )}
      </button>
    );
  }
  return (
    <div
      className="picker"
      role="dialog"
      aria-label={title}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          if (query) setQuery('');
          else onClose();
        }
        if (event.key === 'Enter' && highlighted && event.target === input.current) {
          event.preventDefault();
          onSelect(highlighted);
        }
        if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
        event.preventDefault();
        const position = highlighted ? tokens.indexOf(highlighted) : -1;
        const nextIndex =
          position < 0
            ? event.key === 'ArrowDown'
              ? 0
              : tokens.length - 1
            : Math.max(
                0,
                Math.min(tokens.length - 1, position + (event.key === 'ArrowDown' ? 1 : -1)),
              );
        const next = tokens[nextIndex];
        if (next) setActiveKey(tokenKey(next));
      }}
    >
      <header className="picker-head">
        <button className="iconbtn" aria-label="Close picker" onClick={onClose}>
          <Icon name="back" />
        </button>
        <h2>{title}</h2>
        <span className="picker-kbd">
          <kbd>↑</kbd>
          <kbd>↓</kbd> Navigate <kbd>↵</kbd> Select <kbd>esc</kbd> Back
        </span>
      </header>
      <div className="picker-body">
        <nav className="rail" aria-label="Networks">
          <label className="field field-sm">
            <Icon name="search" size={16} />
            <input
              aria-label="Search networks"
              placeholder="Search networks"
              value={networkQuery}
              onChange={(event) => setNetworkQuery(event.target.value)}
            />
          </label>
          <div className="rail-scroll">
            {networkButton(null)}
            {networkGroups.map((group) =>
              group.chains.length ? (
                <div className="rail-group" key={group.label}>
                  <div className="rail-label">
                    {group.label}
                    {group.label === 'Arbitrum chains' && (
                      <span className="info-dot" title="Chains built with Arbitrum technology">
                        i
                      </span>
                    )}
                  </div>
                  {group.chains.map((chain) => networkButton(chain))}
                </div>
              ) : null,
            )}
          </div>
        </nav>
        <section className="picker-main">
          <label className="field">
            <Icon name="search" />
            <input
              ref={input}
              role="combobox"
              aria-label="Search tokens and networks"
              aria-expanded="true"
              aria-autocomplete="list"
              aria-controls={`${id}-results`}
              aria-activedescendant={highlighted ? optionId(highlighted) : undefined}
              value={query}
              placeholder="Search name or paste address"
              autoComplete="off"
              spellCheck={false}
              onChange={(event) => {
                setQuery(event.target.value);
                setActiveKey(undefined);
                list.current?.scrollToPosition(0);
              }}
            />
            {query && (
              <button
                className="mini"
                aria-label="Clear search"
                onClick={() => {
                  setQuery('');
                  input.current?.focus();
                }}
              >
                <Icon name="close" size={16} />
              </button>
            )}
          </label>
          <div className="chipbar" aria-label="Network filters">
            {networkButton(null, true)}
            {networkGroups
              .flatMap((group) => group.chains)
              .map((chain) => networkButton(chain, true))}
          </div>
          {!query && recentTokens.length > 0 && (
            <div className="recents" aria-label="Recent selections">
              <span className="recents-label">Recent</span>
              {recentTokens.map((token) => {
                // A recent token keeps the providers of the source it was picked with. Use the
                // current lists' copy, or drop the providers so the pick gets resolved again.
                const current =
                  available.find((candidate) => tokenKey(candidate) === tokenKey(token)) ??
                  ({ ...token, providers: undefined, isCounterpart: undefined } as T);
                const changesSource = getProviders !== undefined && !getProviders(current);
                return (
                  <button
                    key={tokenKey(token)}
                    className="recent"
                    title={`${token.symbol} on ${chainName(token.chainId)}${changesSource ? '. Picking it changes the source.' : ''}`}
                    onClick={() => onSelect(current)}
                  >
                    <TokenImage token={token} size={20} />
                    {token.symbol}
                    {changesSource && (
                      <span className="net-warn" aria-label="Changes source">
                        <Icon name="warn" size={12} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
          {suggestions.length > 0 && (
            <div className="netsugg" aria-label="Network suggestions">
              <span>Networks</span>
              {suggestions.slice(0, 3).map((chain) => (
                <button
                  key={chain.chainId}
                  className="recent"
                  onClick={() => changeFilter(chain.chainId, true)}
                >
                  <ChainImage chainId={chain.chainId} size={18} />
                  {chain.name}
                </button>
              ))}
            </div>
          )}
          {(selectionStatus || selectionError || description) && (
            <p className="picker-message" role={selectionError ? 'alert' : 'status'}>
              {selectionStatus ?? selectionError ?? description}
            </p>
          )}
          {hasError && (
            <p className="picker-message" role="alert">
              Some results could not load.{' '}
              <button
                className="linkbtn"
                onClick={() => {
                  void retrySearch();
                }}
              >
                Retry
              </button>
            </p>
          )}
          <div className="vlist" id={`${id}-results`} role="listbox" aria-label="Token results">
            {rows.length ? (
              <AutoSizer>
                {({ height, width }) => (
                  <List
                    ref={list}
                    width={width}
                    height={height}
                    rowCount={rows.length}
                    rowHeight={({ index }) => (rows[index]?.kind === 'header' ? 34 : 60)}
                    rowRenderer={rowRenderer}
                    scrollToIndex={highlightedIndex}
                    overscanRowCount={6}
                  />
                )}
              </AutoSizer>
            ) : (
              <div className="empty">
                {isBusy ? (
                  <>
                    <Spinner /> Loading tokens…
                  </>
                ) : (
                  <>
                    <Icon name="search" size={28} />
                    <b>No matching tokens</b>
                    <span>Try another network or paste a token address.</span>
                  </>
                )}
              </div>
            )}
          </div>
          {(isBusy || incomplete) && (
            <p className="picker-message" role="status">
              {isBusy ? 'Loading results…' : 'Narrow your search to find more tokens'}
            </p>
          )}
          {chainId !== null && query && (
            <button className="linkbtn picker-message" onClick={() => changeFilter(null)}>
              Search all networks
            </button>
          )}
          <p className="sr-only" role="status">
            {copyStatus}
          </p>
        </section>
      </div>
    </div>
  );
}
