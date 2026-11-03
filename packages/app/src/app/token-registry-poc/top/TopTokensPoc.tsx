'use client';

import { useDebounce } from '@uidotdev/usehooks';
import { useState } from 'react';
import { AutoSizer, List, ListRowProps } from 'react-virtualized';
import useSWR from 'swr';
import { twMerge } from 'tailwind-merge';

import {
  DestinationChain,
  DestinationOption,
  TOKEN_REGISTRY_URL,
  TokenList,
  TopFile,
  TopToken,
  searchTokens,
} from '@/app/src/token-registry/registryFiles';
import { NATIVE_TOKEN_ADDRESS, ProviderId } from '@/app/src/token-registry/types';
import { formatCompactUsd } from '@/bridge/util/NumberUtils';
import { getBridgeUiConfigForChain } from '@/bridge/util/bridgeUiConfig';

const ROW_HEIGHT = 56;
const LIST_HEIGHT = 512;
const SEARCH_DEBOUNCE_MS = 250;
// Below this length, the source search only filters the top tokens already loaded.
const MIN_REMOTE_SEARCH_LENGTH = 2;

const AGGRESSIVE_CACHE_OPTIONS = {
  revalidateIfStale: false,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
} as const;

const providerBadgeClasses: Record<ProviderId, string> = {
  canonical: 'bg-sky-500/20 text-sky-300',
  layerzero: 'bg-purple-500/20 text-purple-300',
  lifi: 'bg-amber-500/20 text-amber-300',
};

const providerLabels: Record<ProviderId, string> = {
  canonical: 'Canonical',
  layerzero: 'LayerZero',
  lifi: 'LiFi',
};

type PickerToken = TopToken & { providers?: ProviderId[] };

type SwrKey = [string, string];

type RequestStats = {
  durationMs: number;
  // The browser only reports it when the CDN sends Timing-Allow-Origin.
  transferredBytes?: number;
  decodedBytes: number;
};

async function fetchTopTokens([url]: SwrKey): Promise<{
  file: TopFile;
  stats: RequestStats;
}> {
  const start = performance.now();
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  const text = await response.text();
  const timing = performance.getEntriesByName(url).at(-1) as PerformanceResourceTiming | undefined;

  return {
    file: JSON.parse(text) as TopFile,
    stats: {
      durationMs: performance.now() - start,
      transferredBytes: timing?.encodedBodySize || undefined,
      decodedBytes: new TextEncoder().encode(text).length,
    },
  };
}

async function fetchJson<T>([url]: SwrKey): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return response.json() as Promise<T>;
}

function formatBytes(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function getChainName(chainId: number): string {
  return getBridgeUiConfigForChain(chainId).network.name;
}

function truncateAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function getTokenKey(token: TopToken): string {
  return `${token.chainId}:${token.address}`;
}

// The same ranking as the server's search.
function filterTokens<T extends TopToken>(tokens: T[], search: string): T[] {
  return search.trim() ? searchTokens(tokens, search) : tokens;
}

function ChainIcon({ chainId, className }: { chainId: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={getBridgeUiConfigForChain(chainId).network.logo}
      alt=""
      className={twMerge('h-5 w-5 shrink-0 rounded-full', className)}
    />
  );
}

function TokenIcon({ token }: { token: TopToken }) {
  if (token.logoURI) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={token.logoURI} alt="" className="h-8 w-8 shrink-0 rounded-full" />;
  }

  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-semibold uppercase">
      {token.symbol.slice(0, 3)}
    </div>
  );
}

function TokenWithChainIcon({ token }: { token: TopToken }) {
  return (
    <span className="relative">
      <TokenIcon token={token} />
      <ChainIcon
        chainId={token.chainId}
        className="absolute -bottom-1 -right-1 h-4 w-4 ring-2 ring-black"
      />
    </span>
  );
}

function ProviderBadges({ providers }: { providers?: ProviderId[] }) {
  return (
    <>
      {providers?.map((provider) => (
        <span
          key={provider}
          className={twMerge(
            'rounded px-1.5 py-0.5 text-[10px] font-normal',
            providerBadgeClasses[provider],
          )}
        >
          {providerLabels[provider]}
        </span>
      ))}
    </>
  );
}

// Like Jumper's warning icon: no token list has the token.
function UnverifiedBadge() {
  return (
    <span
      className="rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] font-normal text-red-300"
      title="Imported from its address: no token list has this token"
    >
      Unverified
    </span>
  );
}

function TokenRow({
  token,
  isSelected,
  showChain,
  onSelect,
}: {
  token: PickerToken;
  isSelected: boolean;
  showChain: boolean;
  onSelect: (token: PickerToken) => void;
}) {
  return (
    <button
      onClick={() => onSelect(token)}
      style={{ height: ROW_HEIGHT }}
      className={twMerge(
        'flex w-full items-center gap-3 border-b border-white/5 px-3 text-left hover:bg-white/5',
        isSelected && 'bg-white/10',
      )}
    >
      <TokenIcon token={token} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1 text-sm font-semibold">
          {token.symbol}
          {showChain && (
            <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-normal text-white/70">
              {getChainName(token.chainId)}
            </span>
          )}
          <ProviderBadges providers={token.providers} />
          {token.isImported && <UnverifiedBadge />}
        </span>
        <span className="block truncate text-xs text-white/50">{token.name}</span>
      </span>
      <span className="text-right text-xs text-white/40">
        <span className="block">
          {token.volumeUSD24H === undefined ? '—' : formatCompactUsd(token.volumeUSD24H)}
        </span>
        <span className="block">
          {token.address === NATIVE_TOKEN_ADDRESS ? 'native' : truncateAddress(token.address)}
        </span>
      </span>
    </button>
  );
}

function ChainButton({
  chainId,
  tokenCount,
  isSelected,
  onSelect,
}: {
  chainId: number | null;
  tokenCount?: number;
  isSelected: boolean;
  onSelect: (chainId: number | null) => void;
}) {
  return (
    <button
      onClick={() => onSelect(chainId)}
      className={twMerge(
        'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-white/5',
        isSelected && 'bg-white/10',
      )}
    >
      {chainId === null ? (
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px]">
          ∗
        </span>
      ) : (
        <ChainIcon chainId={chainId} />
      )}
      <span className="min-w-0 flex-1 truncate">
        {chainId === null ? 'All chains' : getChainName(chainId)}
      </span>
      {tokenCount !== undefined && <span className="text-xs text-white/40">{tokenCount}</span>}
    </button>
  );
}

// Like Jumper's picker: pick a token on any chain, or a chain first, then a token on it. The
// tokens of a chain come from the backend at `getListKey`, or from `getChainTokens`, which also
// fills the list until the backend answers. A search goes to the backend at `getSearchKey`, which
// covers every token and not only the listed ones, unless the backend's list is complete.
function TokenPicker({
  title,
  chains,
  allowAllChains,
  initialChainId,
  selectedToken,
  getChainTokens,
  getListKey,
  getSearchKey,
  onSelect,
  onClose,
}: {
  title: string;
  chains: { chainId: number; tokenCount?: number }[];
  allowAllChains: boolean;
  initialChainId: number | null;
  selectedToken: TopToken | null;
  getChainTokens?: (chainId: number | null) => PickerToken[] | undefined;
  getListKey?: (chainId: number | null) => SwrKey | null;
  getSearchKey: (chainId: number | null, query: string) => SwrKey | null;
  onSelect: (token: PickerToken) => void;
  onClose: () => void;
}) {
  const [chainId, setChainId] = useState<number | null>(
    initialChainId ?? (allowAllChains ? null : (chains[0]?.chainId ?? null)),
  );
  const [chainSearch, setChainSearch] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, SEARCH_DEBOUNCE_MS);

  const { data: list, isLoading: isListLoading } = useSWR(
    getListKey?.(chainId) ?? null,
    fetchJson<TokenList<PickerToken>>,
    AGGRESSIVE_CACHE_OPTIONS,
  );
  // A complete list has every token the search could find.
  const searchKey = list?.isComplete ? null : getSearchKey(chainId, debouncedSearch.trim());
  const { data: searchResults, isLoading: isSearchLoading } = useSWR(
    searchKey,
    fetchJson<TokenList<PickerToken>>,
    AGGRESSIVE_CACHE_OPTIONS,
  );
  const searchedTokens = searchResults?.tokens;

  // Until the backend answers, the picker filters the tokens it already has.
  const chainTokens = list?.tokens ?? getChainTokens?.(chainId) ?? [];
  const isTyping = search !== debouncedSearch;
  const tokens =
    searchKey && !isTyping && searchedTokens ? searchedTokens : filterTokens(chainTokens, search);
  const isLoading = isListLoading || (searchKey !== null && (isTyping || isSearchLoading));

  const chainQuery = chainSearch.trim().toLowerCase();
  const visibleChains = chains.filter(({ chainId: id }) =>
    getChainName(id).toLowerCase().includes(chainQuery),
  );

  const rowRenderer = ({ index, key, style }: ListRowProps) => {
    const token = tokens[index];
    if (!token) {
      return null;
    }
    return (
      <div key={key} style={style}>
        <TokenRow
          token={token}
          isSelected={selectedToken !== null && getTokenKey(selectedToken) === getTokenKey(token)}
          showChain={chainId === null}
          onSelect={onSelect}
        />
      </div>
    );
  };

  return (
    <div className="mt-4 rounded-lg border border-white/20 bg-white/5 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-white/60">{title}</h2>
        <button
          onClick={onClose}
          className="rounded-md border border-white/20 px-2 py-0.5 text-sm hover:bg-white/10"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      <div className="mt-3 grid gap-4 sm:grid-cols-[12rem_1fr]">
        <div>
          <input
            value={chainSearch}
            onChange={(event) => setChainSearch(event.target.value)}
            placeholder="Search chains"
            className="w-full rounded-md border border-white/20 bg-white/5 px-3 py-2 text-sm outline-none placeholder:text-white/40 focus:border-white/50"
          />
          <div
            className="mt-2 flex flex-col gap-0.5 overflow-y-auto"
            style={{ maxHeight: LIST_HEIGHT }}
          >
            {allowAllChains && !chainQuery && (
              <ChainButton
                chainId={null}
                tokenCount={
                  chains.some((chain) => chain.tokenCount !== undefined)
                    ? chains.reduce((total, chain) => total + (chain.tokenCount ?? 0), 0)
                    : undefined
                }
                isSelected={chainId === null}
                onSelect={setChainId}
              />
            )}
            {visibleChains.map((chain) => (
              <ChainButton
                key={chain.chainId}
                chainId={chain.chainId}
                tokenCount={chain.tokenCount}
                isSelected={chainId === chain.chainId}
                onSelect={setChainId}
              />
            ))}
          </div>
        </div>

        <div>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={
              chainId === null
                ? 'Search all tokens on all chains'
                : `Search all tokens on ${getChainName(chainId)}`
            }
            className="w-full rounded-md border border-white/20 bg-white/5 px-3 py-2 text-sm outline-none placeholder:text-white/40 focus:border-white/50"
          />
          <p className="mt-1 h-4 text-xs text-white/40">
            {isLoading
              ? 'Searching…'
              : searchKey
                ? `${tokens.length} results from every token`
                : search.trim() && list?.isComplete
                  ? `${tokens.length} results`
                  : ''}
          </p>
          <div className="mt-1 rounded-md border border-white/10" style={{ height: LIST_HEIGHT }}>
            {tokens.length === 0 ? (
              <p className="p-3 text-sm text-white/50">
                {isLoading ? 'Loading…' : 'No tokens match.'}
              </p>
            ) : (
              <AutoSizer>
                {({ height, width }) => (
                  <List
                    width={width}
                    height={height}
                    rowCount={tokens.length}
                    rowHeight={ROW_HEIGHT}
                    rowRenderer={rowRenderer}
                  />
                )}
              </AutoSizer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SelectedTokenButton({
  token,
  placeholder,
  onClick,
}: {
  token: PickerToken | null | undefined;
  placeholder: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="mt-2 flex w-full items-center gap-3 rounded-md border border-white/10 bg-white/5 px-3 py-3 text-left hover:bg-white/10"
    >
      {token ? (
        <>
          <TokenWithChainIcon token={token} />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1 text-sm font-semibold">
              {token.symbol}
              <ProviderBadges providers={token.providers} />
              {token.isImported && <UnverifiedBadge />}
            </span>
            <span className="block text-xs text-white/50">on {getChainName(token.chainId)}</span>
          </span>
        </>
      ) : (
        <span className="text-sm text-white/60">{placeholder}</span>
      )}
    </button>
  );
}

function getSourceSearchKey(chainId: number | null, query: string): SwrKey | null {
  if (query.length < MIN_REMOTE_SEARCH_LENGTH) {
    return null;
  }
  const params = new URLSearchParams({ q: query });
  if (chainId !== null) {
    params.set('chainId', String(chainId));
  }
  return [`/api/token-registry/files/search?${params}`, 'token-registry-search'];
}

function getDestinationTokensKey({
  sourceToken,
  destinationChainId,
  query,
}: {
  sourceToken: TopToken;
  destinationChainId: number | null;
  query?: string;
}): SwrKey {
  // Without a destination chain, the tokens of every chain the source reaches.
  const params = new URLSearchParams({
    sourceChainId: String(sourceToken.chainId),
    sourceToken: sourceToken.address,
    ...(destinationChainId === null ? {} : { destinationChainId: String(destinationChainId) }),
  });
  if (query) {
    params.set('q', query);
  }
  return [
    `/api/token-registry/files/destination-tokens?${params}`,
    'token-registry-destination-tokens',
  ];
}

export function TopTokensPoc() {
  const [sourceToken, setSourceToken] = useState<TopToken | null>(null);
  const [destinationChainId, setDestinationChainId] = useState<number | null>(null);
  // Set when the user picks a destination token. Each chain then defaults to that token, or to its
  // counterpart on the chain, until the user picks another one.
  const [destinationToken, setDestinationToken] = useState<DestinationOption | null>(null);
  const [openPicker, setOpenPicker] = useState<'source' | 'destination' | null>(null);
  // Null opens the destination picker on all chains.
  const [destinationPickerChainId, setDestinationPickerChainId] = useState<number | null>(null);

  const { data, error } = useSWR(
    [`${TOKEN_REGISTRY_URL}/top.json`, 'token-registry-top'] as SwrKey,
    fetchTopTokens,
    AGGRESSIVE_CACHE_OPTIONS,
  );

  const { data: destinationChainsResponse, error: destinationChainsError } = useSWR(
    sourceToken
      ? ([
          `/api/token-registry/files/destination-chains?${new URLSearchParams({
            sourceChainId: String(sourceToken.chainId),
            sourceToken: sourceToken.address,
            ...(destinationToken
              ? {
                  preferredChainId: String(destinationToken.chainId),
                  preferredToken: destinationToken.address,
                }
              : {}),
          })}`,
          'token-registry-destination-chains',
          getTokenKey(sourceToken),
        ] as const)
      : null,
    async ([url, , sourceKey]: readonly [string, string, string]) => ({
      sourceKey,
      chains: await fetchJson<DestinationChain[]>([url, 'token-registry-destination-chains']),
    }),
    // Keeps the chain chips on screen while a new pick reloads their defaults.
    { ...AGGRESSIVE_CACHE_OPTIONS, keepPreviousData: true },
  );
  // keepPreviousData would show the previous source's chains while a new source loads.
  const destinationChains =
    sourceToken && destinationChainsResponse?.sourceKey === getTokenKey(sourceToken)
      ? destinationChainsResponse.chains
      : undefined;
  // Fills the picker's all-chains view with the canonical tokens until the full list loads.
  const allChainsCanonicalTokens = destinationChains?.flatMap((chain) =>
    chain.canonicalToken ? [chain.canonicalToken] : [],
  );

  const topTokens = data?.file.tokens ?? [];
  const tokenCountByChainId = new Map<number, number>();
  for (const token of topTokens) {
    tokenCountByChainId.set(token.chainId, (tokenCountByChainId.get(token.chainId) ?? 0) + 1);
  }

  // A new source or a new chain keeps the destination chain and token when the source can reach
  // them: the server's default is the picked token's counterpart, or the source's.
  const activeDestinationChain =
    destinationChains?.find((chain) => chain.chainId === destinationChainId) ??
    destinationChains?.[0];
  const displayedDestinationToken =
    destinationToken?.chainId === activeDestinationChain?.chainId
      ? destinationToken
      : activeDestinationChain?.defaultToken;

  // Like Jumper, picking a source moves on to the destination.
  function handleSelectSource(token: PickerToken) {
    setSourceToken(token);
    setDestinationPickerChainId(null);
    setOpenPicker('destination');
  }

  function openDestinationPicker() {
    setDestinationPickerChainId(activeDestinationChain?.chainId ?? null);
    setOpenPicker('destination');
  }

  function handleSelectDestinationChain(chainId: number) {
    setDestinationChainId(chainId);
  }

  function handleSelectDestination(token: PickerToken) {
    setDestinationChainId(token.chainId);
    setDestinationToken(token as DestinationOption);
    setOpenPicker(null);
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold">Token Registry PoC: top tokens</h1>
      <p className="mt-2 text-sm text-white/60">
        One request for the picker&apos;s tokens on every chain, from {TOKEN_REGISTRY_URL}/top.json.
        Searches and destinations go through the backend, which reads every token.
      </p>

      {error && <p className="mt-6 text-red-400">Failed to load top.json: {String(error)}</p>}
      {!data && !error && <p className="mt-6 text-sm text-white/50">Loading top tokens…</p>}

      {data && (
        <>
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-white/50">Tokens</dt>
              <dd>{topTokens.length}</dd>
            </div>
            <div>
              <dt className="text-white/50">Request</dt>
              <dd>{Math.round(data.stats.durationMs)} ms</dd>
            </div>
            <div>
              <dt className="text-white/50">Transferred / JSON</dt>
              <dd>
                {data.stats.transferredBytes === undefined
                  ? 'n/a'
                  : formatBytes(data.stats.transferredBytes)}{' '}
                / {formatBytes(data.stats.decodedBytes)}
              </dd>
            </div>
            <div>
              <dt className="text-white/50">Generated</dt>
              <dd>{new Date(data.file.generatedAt).toLocaleString()}</dd>
            </div>
          </dl>

          <h2 className="mt-6 text-sm font-semibold uppercase tracking-wide text-white/60">From</h2>
          <SelectedTokenButton
            token={sourceToken}
            placeholder="Select chain and token"
            onClick={() => setOpenPicker('source')}
          />
          {openPicker === 'source' && (
            <TokenPicker
              title="Select a source token"
              chains={[...tokenCountByChainId].map(([chainId, tokenCount]) => ({
                chainId,
                tokenCount,
              }))}
              allowAllChains
              initialChainId={sourceToken?.chainId ?? null}
              selectedToken={sourceToken}
              getChainTokens={(chainId) =>
                chainId === null
                  ? topTokens
                  : topTokens.filter((token) => token.chainId === chainId)
              }
              getSearchKey={getSourceSearchKey}
              onSelect={handleSelectSource}
              onClose={() => setOpenPicker(null)}
            />
          )}

          {sourceToken && (
            <>
              <h2 className="mt-6 text-sm font-semibold uppercase tracking-wide text-white/60">
                To
              </h2>
              {destinationChainsError && (
                <p className="mt-2 text-red-400">
                  Failed to load the destinations: {String(destinationChainsError)}
                </p>
              )}
              {!destinationChains && !destinationChainsError && (
                <p className="mt-2 text-sm text-white/50">Loading destinations…</p>
              )}
              {destinationChains?.length === 0 && (
                <p className="mt-2 text-sm text-white/50">No route from this token.</p>
              )}
              {destinationChains && destinationChains.length > 0 && (
                <>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {destinationChains.map((chain) => (
                      <button
                        key={chain.chainId}
                        onClick={() => handleSelectDestinationChain(chain.chainId)}
                        className={twMerge(
                          'flex items-center gap-1.5 rounded-full border border-white/20 px-3 py-1 text-xs hover:bg-white/10',
                          chain.chainId === activeDestinationChain?.chainId &&
                            'border-white/60 bg-white/10',
                        )}
                      >
                        <ChainIcon chainId={chain.chainId} className="h-4 w-4" />
                        {getChainName(chain.chainId)}
                      </button>
                    ))}
                  </div>
                  <SelectedTokenButton
                    token={displayedDestinationToken}
                    placeholder="Select destination token"
                    onClick={openDestinationPicker}
                  />
                </>
              )}
              {openPicker === 'destination' && destinationChains && (
                <TokenPicker
                  key={`${getTokenKey(sourceToken)}-${destinationPickerChainId}`}
                  title="Select a destination token"
                  chains={destinationChains.map(({ chainId }) => ({ chainId }))}
                  allowAllChains
                  initialChainId={destinationPickerChainId}
                  selectedToken={displayedDestinationToken ?? null}
                  getChainTokens={(chainId) =>
                    chainId === null ? allChainsCanonicalTokens : undefined
                  }
                  getListKey={(chainId) =>
                    getDestinationTokensKey({ sourceToken, destinationChainId: chainId })
                  }
                  getSearchKey={(chainId, query) =>
                    query
                      ? getDestinationTokensKey({ sourceToken, destinationChainId: chainId, query })
                      : null
                  }
                  onSelect={handleSelectDestination}
                  onClose={() => setOpenPicker(null)}
                />
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
