'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { twMerge } from 'tailwind-merge';
import { isAddress } from 'viem';

import {
  ChainIds,
  chainNames,
  isSupportedPair,
  supportedPairs,
} from '@/app/src/token-registry/constants';
import {
  Address,
  ChainPair,
  NATIVE_TOKEN_ADDRESS,
  ProviderId,
  SelectedTokenAvailability,
  Token,
  TokenId,
  addressFromTokenId,
  isNativeToken,
  pairKey,
  toTokenId,
} from '@/app/src/token-registry/types';

const ROW_HEIGHT = 56;
const LIST_HEIGHT = 512;
const OVERSCAN = 5;

const providerBadgeClasses: Record<ProviderId, string> = {
  canonical: 'bg-sky-500/20 text-sky-300',
  layerzero: 'bg-purple-500/20 text-purple-300',
  lifi: 'bg-amber-500/20 text-amber-300',
};

const providerLabels: Record<ProviderId, string> = {
  canonical: 'Canonical bridge',
  layerzero: 'LayerZero',
  lifi: 'LiFi',
};

const DEFAULT_PAIR: ChainPair = {
  sourceChainId: ChainIds.Ethereum,
  destinationChainId: ChainIds.ArbitrumOne,
};

const AGGRESSIVE_CACHE_OPTIONS = {
  revalidateIfStale: false,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
} as const;

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return response.json() as Promise<T>;
}

function getSelectionUrl({
  pair,
  sourceTokenAddress,
  destinationTokenAddress,
}: {
  pair: ChainPair;
  sourceTokenAddress: Address;
  destinationTokenAddress?: Address | null;
}): string {
  const destinationTokenQuery = destinationTokenAddress
    ? `&destinationToken=${encodeURIComponent(destinationTokenAddress)}`
    : '';
  return `/api/token-registry/selection/${pair.sourceChainId}/${
    pair.destinationChainId
  }?sourceToken=${encodeURIComponent(sourceTokenAddress)}${destinationTokenQuery}`;
}

function getDestinationTokensUrl({
  pair,
  sourceTokenAddress,
}: {
  pair: ChainPair;
  sourceTokenAddress: Address;
}): string {
  return `/api/token-registry/destination-tokens/${pair.sourceChainId}/${
    pair.destinationChainId
  }?sourceToken=${encodeURIComponent(sourceTokenAddress)}`;
}

function truncateAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function getTokenSearchText(token: Token): string {
  return `${token.symbol} ${token.name} ${token.address}`.toLowerCase();
}

function filterTokenList(tokens: Token[], search?: string): Token[] {
  const term = search?.trim().toLowerCase();
  if (!term) {
    return tokens;
  }
  return tokens.filter((token) => getTokenSearchText(token).includes(term));
}

function parseAddress(value: string | null): Address | null {
  const normalized = value?.trim().toLowerCase();
  return normalized && isAddress(normalized) ? normalized : null;
}

function parseChainId(value: string | null, fallback: number): number {
  const chainId = Number(value);
  return Number.isInteger(chainId) && chainNames[chainId] ? chainId : fallback;
}

function parseQuerySelection(queryString: string): {
  pair: ChainPair;
  sourceTokenId: TokenId | null;
  destinationTokenAddress: Address | null;
} {
  const params = new URLSearchParams(queryString);
  const requestedPair = {
    sourceChainId: parseChainId(params.get('sourceChain'), DEFAULT_PAIR.sourceChainId),
    destinationChainId: parseChainId(
      params.get('destinationChain'),
      DEFAULT_PAIR.destinationChainId,
    ),
  };
  const pair = isSupportedPair(requestedPair) ? requestedPair : DEFAULT_PAIR;
  const sourceTokenAddress = parseAddress(params.get('sourceToken'));

  return {
    pair,
    sourceTokenId: sourceTokenAddress ? toTokenId(pair.sourceChainId, sourceTokenAddress) : null,
    destinationTokenAddress: parseAddress(params.get('destinationToken')),
  };
}

function TokenIcon({ token }: { token: Token }) {
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-semibold uppercase">
      {token.symbol.slice(0, 3)}
    </div>
  );
}

function TokenRow({
  token,
  isSelected,
  onSelect,
}: {
  token: Token;
  isSelected?: boolean;
  onSelect?: (tokenId: TokenId) => void;
}) {
  const content = (
    <>
      <TokenIcon token={token} />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{token.symbol}</span>
        <span className="block truncate text-xs text-white/50">{token.name}</span>
      </span>
      <span className="text-xs text-white/40">
        {isNativeToken(token) ? 'native' : truncateAddress(token.address)}
      </span>
    </>
  );

  if (!onSelect) {
    return (
      <div className="flex w-full items-center gap-3 px-3" style={{ height: ROW_HEIGHT }}>
        {content}
      </div>
    );
  }

  return (
    <button
      onClick={() => onSelect(token.id)}
      style={{ height: ROW_HEIGHT }}
      className={twMerge(
        'flex w-full items-center gap-3 px-3 text-left hover:bg-white/5',
        isSelected && 'bg-white/10',
      )}
    >
      {content}
    </button>
  );
}

function VirtualizedTokenList({
  tokens,
  selectedTokenId,
  onSelect,
}: {
  tokens: Token[];
  selectedTokenId?: TokenId | null;
  onSelect?: (tokenId: TokenId) => void;
}) {
  const [scrollTop, setScrollTop] = useState(0);

  const totalHeight = tokens.length * ROW_HEIGHT;
  const clampedScrollTop = Math.min(scrollTop, Math.max(0, totalHeight - LIST_HEIGHT));
  const start = Math.max(0, Math.floor(clampedScrollTop / ROW_HEIGHT) - OVERSCAN);
  const end = Math.min(
    tokens.length,
    Math.ceil((clampedScrollTop + LIST_HEIGHT) / ROW_HEIGHT) + OVERSCAN,
  );
  const visibleTokens = tokens.slice(start, end);

  if (tokens.length === 0) {
    return (
      <div className="rounded-md border border-white/10 p-3 text-sm text-white/50">
        No tokens match.
      </div>
    );
  }

  return (
    <div
      className="overflow-y-auto rounded-md border border-white/10"
      style={{ height: LIST_HEIGHT }}
      onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
    >
      <div className="relative" style={{ height: totalHeight }}>
        <ul className="absolute inset-x-0" style={{ top: start * ROW_HEIGHT }}>
          {visibleTokens.map((token) => (
            <li key={token.id} className="border-b border-white/5" style={{ height: ROW_HEIGHT }}>
              <TokenRow
                token={token}
                isSelected={token.id === selectedTokenId}
                onSelect={onSelect}
              />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function DestinationLabel({ destinationToken }: { destinationToken?: Token }) {
  if (!destinationToken) {
    return <span className="text-sm text-white/60">→ selected destination token</span>;
  }

  return (
    <span className="text-sm">
      → <span className="font-semibold">{destinationToken.symbol}</span>{' '}
      <span className="text-white/50">
        ({isNativeToken(destinationToken) ? 'native' : truncateAddress(destinationToken.address)})
      </span>
    </span>
  );
}

export function TokenRegistryPoc() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const querySelection = useMemo(() => parseQuerySelection(queryString), [queryString]);
  const pair = querySelection.pair;

  const [search, setSearch] = useState('');
  const [destinationSearch, setDestinationSearch] = useState('');
  const [isSourcePickerOpen, setIsSourcePickerOpen] = useState(false);
  const [isDestinationPickerOpen, setIsDestinationPickerOpen] = useState(false);
  const [importedSourceTokens, setImportedSourceTokens] = useState<Record<string, Token[]>>({});
  const [importStatus, setImportStatus] = useState<'idle' | 'loading' | 'error'>('idle');

  const currentPairKey = pairKey(pair);

  useEffect(() => {
    setSearch('');
    setDestinationSearch('');
    setIsSourcePickerOpen(false);
    setIsDestinationPickerOpen(false);
    setImportStatus('idle');
  }, [currentPairKey]);

  const pairImportedSourceTokens = useMemo(
    () => importedSourceTokens[currentPairKey] ?? [],
    [importedSourceTokens, currentPairKey],
  );
  const effectiveSelectedTokenId =
    querySelection.sourceTokenId ?? toTokenId(pair.sourceChainId, NATIVE_TOKEN_ADDRESS);
  const selectedSourceAddress = addressFromTokenId(effectiveSelectedTokenId);
  const selectedDestinationAddress = querySelection.destinationTokenAddress;

  const { data: sourceTokensFromServer, error: sourceTokensError } = useSWR(
    isSourcePickerOpen
      ? [pair.sourceChainId, pair.destinationChainId, 'token-registry-source-tokens']
      : null,
    ([sourceChainId, destinationChainId]) =>
      fetchJson<Token[]>(
        `/api/token-registry/source-tokens/${sourceChainId}/${destinationChainId}`,
      ),
    AGGRESSIVE_CACHE_OPTIONS,
  );

  const sourceTokens = useMemo<Token[]>(() => {
    if (!isSourcePickerOpen || !sourceTokensFromServer) {
      return [];
    }

    const seen = new Set<TokenId>();
    const imported: Token[] = [];
    for (const token of pairImportedSourceTokens) {
      if (token.chainId === pair.sourceChainId && !seen.has(token.id)) {
        seen.add(token.id);
        imported.push(token);
      }
    }

    const base = sourceTokensFromServer.filter((token) => {
      if (seen.has(token.id)) {
        return false;
      }
      seen.add(token.id);
      return true;
    });
    base.sort((a, b) => a.symbol.localeCompare(b.symbol));

    return filterTokenList([...imported, ...base], search);
  }, [
    isSourcePickerOpen,
    pair.sourceChainId,
    pairImportedSourceTokens,
    search,
    sourceTokensFromServer,
  ]);

  const {
    data: serverSelection,
    error: selectionError,
    isLoading: isSelectionRequestLoading,
  } = useSWR(
    [
      pair.sourceChainId,
      pair.destinationChainId,
      selectedSourceAddress,
      selectedDestinationAddress,
      'token-registry-selection',
    ],
    ([sourceChainId, destinationChainId, sourceToken, destinationToken]) =>
      fetchJson<SelectedTokenAvailability>(
        getSelectionUrl({
          pair: { sourceChainId, destinationChainId },
          sourceTokenAddress: sourceToken,
          destinationTokenAddress: destinationToken,
        }),
      ),
    { ...AGGRESSIVE_CACHE_OPTIONS, keepPreviousData: true },
  );

  const isServerSelectionForCurrentPairAndSource =
    serverSelection &&
    serverSelection.sourceToken.chainId === pair.sourceChainId &&
    serverSelection.sourceToken.address === selectedSourceAddress &&
    serverSelection.destinationToken.chainId === pair.destinationChainId;
  const isServerSelectionForRequestedDestination =
    !selectedDestinationAddress ||
    serverSelection?.destinationToken.address === selectedDestinationAddress;
  const selection =
    isServerSelectionForCurrentPairAndSource &&
    (isServerSelectionForRequestedDestination || !isSelectionRequestLoading)
      ? serverSelection
      : null;
  const isSelectionLoading = !selectionError && !selection;
  const displaySelection = selection ?? (!selectionError ? serverSelection : null);
  const selectedToken = selection?.sourceToken ?? null;
  const selectedDestinationToken = selection?.destinationToken ?? null;
  const displaySelectedToken = displaySelection?.sourceToken ?? null;
  const displaySelectedDestinationToken = displaySelection?.destinationToken ?? null;
  const displaySelectedRoutes = displaySelection?.availableRoutes ?? [];
  const displaySelectedHasSwapRoute = displaySelectedRoutes.some(
    (route) => route.provider === 'lifi',
  );

  const { data: destinationTokenOptionsFromServer, error: destinationTokensError } = useSWR(
    !isDestinationPickerOpen || !selectedToken
      ? null
      : [
          pair.sourceChainId,
          pair.destinationChainId,
          selectedToken.address,
          'token-registry-destination-tokens',
        ],
    ([sourceChainId, destinationChainId, sourceTokenAddress]) =>
      fetchJson<Token[]>(
        getDestinationTokensUrl({
          pair: { sourceChainId, destinationChainId },
          sourceTokenAddress: sourceTokenAddress as Address,
        }),
      ),
    AGGRESSIVE_CACHE_OPTIONS,
  );

  const destinationTokenOptions = destinationTokenOptionsFromServer ?? [];
  const destinationTokens = filterTokenList(destinationTokenOptions, destinationSearch);

  const replaceSelectionUrl = useCallback(
    ({
      pair: nextPair,
      sourceTokenAddress,
      destinationTokenAddress,
    }: {
      pair: ChainPair;
      sourceTokenAddress: Address;
      destinationTokenAddress?: Address | null;
    }) => {
      const params = new URLSearchParams(queryString);
      params.set('sourceChain', String(nextPair.sourceChainId));
      params.set('destinationChain', String(nextPair.destinationChainId));
      params.set('sourceToken', sourceTokenAddress);
      if (destinationTokenAddress) {
        params.set('destinationToken', destinationTokenAddress);
      } else {
        params.delete('destinationToken');
      }

      const nextQueryString = params.toString();
      if (nextQueryString !== queryString) {
        router.replace(`${pathname}?${nextQueryString}`, { scroll: false });
      }
    },
    [pathname, queryString, router],
  );

  useEffect(() => {
    if (!selectedToken || !selectedDestinationToken) {
      return;
    }

    const explicitDestinationAddress =
      selectedDestinationAddress === selectedDestinationToken.address
        ? selectedDestinationAddress
        : null;

    replaceSelectionUrl({
      pair,
      sourceTokenAddress: selectedToken.address,
      destinationTokenAddress: explicitDestinationAddress,
    });
  }, [
    pair,
    replaceSelectionUrl,
    selectedDestinationAddress,
    selectedDestinationToken,
    selectedToken,
  ]);

  const searchedAddress = parseAddress(search);
  const canImport =
    isSourcePickerOpen &&
    searchedAddress &&
    sourceTokens.every((token) => token.address !== searchedAddress);

  const error =
    (selection ? undefined : selectionError) ??
    (isSourcePickerOpen ? sourceTokensError : undefined) ??
    (isDestinationPickerOpen ? destinationTokensError : undefined);
  const isSourcePickerLoading = isSourcePickerOpen && !sourceTokensError && !sourceTokensFromServer;
  const isDestinationPickerLoading =
    isDestinationPickerOpen && !destinationTokensError && !destinationTokenOptionsFromServer;

  function flipDirection() {
    const nextPair = {
      sourceChainId: pair.destinationChainId,
      destinationChainId: pair.sourceChainId,
    };
    const nextSourceAddress =
      displaySelectedDestinationToken?.address ??
      selectedDestinationAddress ??
      NATIVE_TOKEN_ADDRESS;
    const nextDestinationAddress = displaySelectedToken?.address ?? selectedSourceAddress;

    replaceSelectionUrl({
      pair: nextPair,
      sourceTokenAddress: nextSourceAddress,
      destinationTokenAddress: nextDestinationAddress,
    });
    setSearch('');
    setDestinationSearch('');
    setIsSourcePickerOpen(false);
    setIsDestinationPickerOpen(false);
    setImportStatus('idle');
  }

  function handlePairSelect(value: string) {
    const nextPair = supportedPairs.find((candidate) => pairKey(candidate) === value);
    if (!nextPair || pairKey(nextPair) === currentPairKey) {
      return;
    }

    replaceSelectionUrl({
      pair: nextPair,
      sourceTokenAddress: NATIVE_TOKEN_ADDRESS,
      destinationTokenAddress: null,
    });
    setSearch('');
    setDestinationSearch('');
    setIsSourcePickerOpen(false);
    setIsDestinationPickerOpen(false);
    setImportStatus('idle');
  }

  function handleSelectToken(tokenId: TokenId) {
    replaceSelectionUrl({
      pair,
      sourceTokenAddress: addressFromTokenId(tokenId),
      destinationTokenAddress: null,
    });
    setDestinationSearch('');
    setIsSourcePickerOpen(false);
    setIsDestinationPickerOpen(false);
  }

  function handleSelectDestinationToken(tokenId: TokenId) {
    replaceSelectionUrl({
      pair,
      sourceTokenAddress: selectedSourceAddress,
      destinationTokenAddress: addressFromTokenId(tokenId),
    });
    setDestinationSearch('');
    setIsDestinationPickerOpen(false);
  }

  async function handleImport() {
    if (!searchedAddress) {
      return;
    }
    setImportStatus('loading');
    try {
      const importedSelection = await fetchJson<SelectedTokenAvailability>(
        getSelectionUrl({
          pair,
          sourceTokenAddress: searchedAddress,
        }),
      );
      setImportedSourceTokens((previous) => ({
        ...previous,
        [currentPairKey]: [
          importedSelection.sourceToken,
          ...(previous[currentPairKey] ?? []).filter(
            (token) => token.id !== importedSelection.sourceToken.id,
          ),
        ],
      }));
      replaceSelectionUrl({
        pair,
        sourceTokenAddress: importedSelection.sourceToken.address,
        destinationTokenAddress: null,
      });
      setSearch('');
      setIsSourcePickerOpen(false);
      setImportStatus('idle');
    } catch {
      setImportStatus('error');
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-2xl font-semibold">Token Registry PoC</h1>

      <div className="mt-4 flex items-center gap-3 text-lg">
        <span>{chainNames[pair.sourceChainId]}</span>
        <button
          onClick={flipDirection}
          className="rounded-md border border-white/20 px-3 py-1 text-sm hover:bg-white/10"
          aria-label="Flip direction"
        >
          ⇄
        </button>
        <span>{chainNames[pair.destinationChainId]}</span>
        <select
          aria-label="Bridge pair"
          value={currentPairKey}
          onChange={(event) => handlePairSelect(event.target.value)}
          className="ml-3 rounded-md border border-white/20 bg-black px-3 py-1 text-sm text-white"
        >
          {supportedPairs.map((option) => (
            <option key={pairKey(option)} value={pairKey(option)}>
              {chainNames[option.sourceChainId]} → {chainNames[option.destinationChainId]}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="mt-6 text-red-400">Failed to load the registry: {String(error)}</p>}
      {displaySelection && displaySelectedToken && displaySelectedDestinationToken && (
        <div
          className={twMerge(
            'mt-6 grid gap-6 transition-opacity md:grid-cols-2',
            isSelectionLoading && 'opacity-50',
          )}
          aria-busy={isSelectionLoading}
        >
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-white/60">
              Source token
            </h2>
            <div className="mt-2 rounded-md border border-white/10 bg-white/5">
              <TokenRow token={displaySelectedToken} />
            </div>

            {!isSourcePickerOpen && (
              <button
                onClick={() => setIsSourcePickerOpen(true)}
                className="mt-4 rounded-md border border-white/20 px-3 py-1.5 text-sm hover:bg-white/10"
              >
                Show source tokens
              </button>
            )}

            {isSourcePickerOpen && (
              <div className="mt-4">
                <button
                  onClick={() => setIsSourcePickerOpen(false)}
                  className="mb-3 rounded-md border border-white/20 px-3 py-1.5 text-sm hover:bg-white/10"
                >
                  Hide source tokens
                </button>

                {isSourcePickerLoading && (
                  <p className="text-sm text-white/50">Loading source tokens…</p>
                )}

                {!isSourcePickerLoading && sourceTokensFromServer && (
                  <>
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search by symbol, name or address"
                      className="w-full rounded-md border border-white/20 bg-white/5 px-3 py-2 text-sm outline-none placeholder:text-white/40 focus:border-white/50"
                    />

                    {canImport && (
                      <div className="mt-3 rounded-md border border-white/20 bg-white/5 p-3 text-sm">
                        <p className="text-white/70">No token with this address in the registry.</p>
                        <button
                          onClick={handleImport}
                          disabled={importStatus === 'loading'}
                          className="mt-2 rounded-md bg-white px-3 py-1.5 font-semibold text-black hover:bg-white/80 disabled:opacity-50"
                        >
                          {importStatus === 'loading'
                            ? 'Resolving via canonical bridge…'
                            : 'Import token'}
                        </button>
                        {importStatus === 'error' && (
                          <p className="mt-2 text-red-400">
                            Not transferable to {chainNames[pair.destinationChainId]} via the
                            canonical bridge.
                          </p>
                        )}
                      </div>
                    )}

                    <p className="mt-3 text-xs text-white/50">
                      {sourceTokens.length} transferable token
                      {sourceTokens.length === 1 ? '' : 's'}
                    </p>

                    <div className="mt-2">
                      <VirtualizedTokenList
                        tokens={sourceTokens}
                        selectedTokenId={effectiveSelectedTokenId}
                        onSelect={handleSelectToken}
                      />
                    </div>
                  </>
                )}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-white/60">
              Destination token
            </h2>
            <div className="mt-2 rounded-md border border-white/10 bg-white/5">
              <TokenRow token={displaySelectedDestinationToken} />
            </div>

            <p className="mt-3 text-sm text-white/50">
              {displaySelectedHasSwapRoute ? 'Swap supported' : 'Fixed bridge route'}
            </p>

            <h2 className="mt-6 text-sm font-semibold uppercase tracking-wide text-white/60">
              Routes to {chainNames[pair.destinationChainId]}
            </h2>

            {displaySelectedRoutes.length === 0 && (
              <p className="mt-2 text-white/60">No routes available.</p>
            )}

            <ul className="mt-2 space-y-2">
              {displaySelectedRoutes.map((route, index) => (
                <li
                  key={`${route.provider}-${index}`}
                  className="rounded-md border border-white/10 bg-white/5 p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span
                      className={twMerge(
                        'rounded px-2 py-0.5 text-xs font-semibold',
                        providerBadgeClasses[route.provider],
                      )}
                    >
                      {providerLabels[route.provider]}
                    </span>
                    <DestinationLabel destinationToken={route.destinationToken} />
                  </div>
                  {route.provider === 'layerzero' && (
                    <p className="mt-2 text-xs text-white/40">
                      OFT adapter {truncateAddress(route.oftAdapter)} · endpoint{' '}
                      {route.destinationEndpointId}
                    </p>
                  )}
                </li>
              ))}
            </ul>

            {!isDestinationPickerOpen && (
              <button
                onClick={() => setIsDestinationPickerOpen(true)}
                className="mt-6 rounded-md border border-white/20 px-3 py-1.5 text-sm hover:bg-white/10"
              >
                Show destination tokens
              </button>
            )}

            {isDestinationPickerOpen && (
              <div className="mt-6">
                <button
                  onClick={() => setIsDestinationPickerOpen(false)}
                  className="mb-3 rounded-md border border-white/20 px-3 py-1.5 text-sm hover:bg-white/10"
                >
                  Hide destination tokens
                </button>

                {isDestinationPickerLoading && (
                  <p className="text-sm text-white/50">Loading destination tokens…</p>
                )}

                {!isDestinationPickerLoading && destinationTokenOptionsFromServer && (
                  <>
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-white/60">
                      {destinationTokenOptions.length} destination token
                      {destinationTokenOptions.length === 1 ? '' : 's'}
                    </h2>
                    <input
                      value={destinationSearch}
                      onChange={(event) => setDestinationSearch(event.target.value)}
                      placeholder="Search by symbol, name or address"
                      className="mt-2 w-full rounded-md border border-white/20 bg-white/5 px-3 py-2 text-sm outline-none placeholder:text-white/40 focus:border-white/50"
                    />
                    <div className="mt-2">
                      <VirtualizedTokenList
                        tokens={destinationTokens}
                        selectedTokenId={displaySelectedDestinationToken.id}
                        onSelect={handleSelectDestinationToken}
                      />
                    </div>
                  </>
                )}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
