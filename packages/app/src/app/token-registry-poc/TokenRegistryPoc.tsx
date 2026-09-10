'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { twMerge } from 'tailwind-merge';

import { ChainIds, chainNames } from '@/app/src/token-registry/constants';
import {
  filterTokens,
  getDestinationTokens,
  getRoutes,
  getSourceTokens,
  hasSwapRoute,
} from '@/app/src/token-registry/selectors';
import {
  Address,
  ChainPair,
  ImportResolution,
  ProviderId,
  RouteMapArtifact,
  RouteOption,
  Token,
  TokenId,
  TokenPayload,
  isNativeToken,
  pairKey,
  toTokenId,
} from '@/app/src/token-registry/types';
import { RegistryView, buildRegistryView, hydrateTokens } from '@/app/src/token-registry/view';

const ROW_HEIGHT = 56; // px — must match TokenRow's h-14
const LIST_HEIGHT = 512; // px — must match the list container's h-[32rem]
const OVERSCAN = 5;

// the app theme overrides `blue` and `orange` with flat colors (no -500
// scale), so those scales never compile — use sky/amber instead
const providerBadgeClasses: Record<ProviderId, string> = {
  canonical: 'bg-sky-500/20 text-sky-300',
  cctp: 'bg-green-500/20 text-green-300',
  layerzero: 'bg-purple-500/20 text-purple-300',
  lifi: 'bg-amber-500/20 text-amber-300',
};

const providerLabels: Record<ProviderId, string> = {
  canonical: 'Canonical bridge',
  cctp: 'CCTP',
  layerzero: 'LayerZero',
  lifi: 'LiFi',
};

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return response.json() as Promise<T>;
}

function truncateAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
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
    return <div className="flex h-14 w-full items-center gap-3 px-3">{content}</div>;
  }

  return (
    <button
      onClick={() => onSelect(token.id)}
      className={twMerge(
        'flex h-14 w-full items-center gap-3 px-3 text-left hover:bg-white/5',
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
  // clamp so a shrinking list (search) cannot leave us scrolled past the end
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
      className="h-[32rem] overflow-y-auto rounded-md border border-white/10"
      onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
    >
      <div className="relative" style={{ height: totalHeight }}>
        <ul className="absolute inset-x-0" style={{ top: start * ROW_HEIGHT }}>
          {visibleTokens.map((token) => (
            <li key={token.id} className="h-14 border-b border-white/5">
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

function DestinationLabel({
  destinationTokenId,
  tokens,
}: {
  destinationTokenId: TokenId | undefined;
  tokens: Map<TokenId, Token>;
}) {
  if (!destinationTokenId) {
    return (
      <span className="text-sm text-white/60">
        Swap only — pick a destination from the swap set
      </span>
    );
  }

  const token = tokens.get(destinationTokenId);
  if (!token) {
    return <span className="text-sm text-white/60">→ {truncateAddress(destinationTokenId)}</span>;
  }

  return (
    <span className="text-sm">
      → <span className="font-semibold">{token.symbol}</span>{' '}
      <span className="text-white/50">
        ({isNativeToken(token) ? 'native' : truncateAddress(token.address)})
      </span>
    </span>
  );
}

export function TokenRegistryPoc() {
  const [pair, setPair] = useState<ChainPair>({
    sourceChainId: ChainIds.Ethereum,
    destinationChainId: ChainIds.ArbitrumOne,
  });
  const [search, setSearch] = useState('');
  const [destinationSearch, setDestinationSearch] = useState('');
  const [isDestinationPickerOpen, setIsDestinationPickerOpen] = useState(false);
  const [selectedTokenId, setSelectedTokenId] = useState<TokenId | null>(null);
  const [overlays, setOverlays] = useState<Record<string, ImportResolution[]>>({});
  const [importStatus, setImportStatus] = useState<'idle' | 'loading' | 'error'>('idle');

  const currentPairKey = pairKey(pair);
  const pairOverlays = useMemo(() => overlays[currentPairKey] ?? [], [overlays, currentPairKey]);

  const { data: sourceTokensPayload, error: sourceTokensError } = useSWR(
    [pair.sourceChainId, 'token-registry-chain-tokens'],
    ([chainId]) => fetchJson<TokenPayload[]>(`/api/token-registry/tokens/${chainId}`),
  );
  const { data: destinationTokensPayload, error: destinationTokensError } = useSWR(
    [pair.destinationChainId, 'token-registry-chain-tokens'],
    ([chainId]) => fetchJson<TokenPayload[]>(`/api/token-registry/tokens/${chainId}`),
  );
  const { data: artifact, error: artifactError } = useSWR(
    [pair.sourceChainId, pair.destinationChainId, 'token-registry-routes'],
    ([sourceChainId, destinationChainId]) =>
      fetchJson<RouteMapArtifact>(
        `/api/token-registry/routes/${sourceChainId}/${destinationChainId}`,
      ),
  );

  // hydrate once per pair load — joining, sorting and search indexing happen
  // here, not per keystroke
  const view = useMemo<RegistryView | undefined>(() => {
    if (!artifact || !sourceTokensPayload || !destinationTokensPayload) {
      return undefined;
    }
    return buildRegistryView({
      artifact,
      sourceChainTokens: hydrateTokens(pair.sourceChainId, sourceTokensPayload),
      destinationChainTokens: hydrateTokens(pair.destinationChainId, destinationTokensPayload),
      overlays: pairOverlays,
    });
  }, [
    artifact,
    sourceTokensPayload,
    destinationTokensPayload,
    pairOverlays,
    pair.sourceChainId,
    pair.destinationChainId,
  ]);

  const sourceTokens = useMemo<Token[]>(
    () => (view ? getSourceTokens(view, search) : []),
    [view, search],
  );

  const selectedToken = view && selectedTokenId ? view.tokens.get(selectedTokenId) : null;

  const selectedRoutes = useMemo<RouteOption[]>(
    () => (view && selectedTokenId ? getRoutes(view, selectedTokenId) : []),
    [view, selectedTokenId],
  );

  const selectedHasSwapRoute = Boolean(
    view && selectedTokenId && hasSwapRoute(view, selectedTokenId),
  );
  // the swap destination set is only fetched when the user actually opens
  // the destination picker — not on token selection
  const { data: swapDestinationAddresses } = useSWR(
    selectedHasSwapRoute && isDestinationPickerOpen
      ? [pair.sourceChainId, pair.destinationChainId, 'token-registry-swap-destinations']
      : null,
    ([sourceChainId, destinationChainId]) =>
      fetchJson<Address[]>(
        `/api/token-registry/swap-destinations/${sourceChainId}/${destinationChainId}`,
      ),
  );

  // destination *picker* data: fixed bridge outputs ∪ swap set, sorted like
  // the source list. Only swap-capable tokens need a picker — fixed-output
  // routes already display their destination on the route card.
  const allDestinationTokens = useMemo<Token[]>(() => {
    if (!view || !selectedTokenId || !swapDestinationAddresses) {
      return [];
    }
    return getDestinationTokens({
      view,
      sourceTokenId: selectedTokenId,
      swapDestinations: swapDestinationAddresses,
    }).sort((a, b) => a.symbol.localeCompare(b.symbol));
  }, [view, selectedTokenId, swapDestinationAddresses]);

  const destinationTokens = useMemo<Token[]>(
    () => (view ? filterTokens(view, allDestinationTokens, destinationSearch) : []),
    [view, allDestinationTokens, destinationSearch],
  );

  const trimmedSearch = search.trim().toLowerCase();
  const isAddressSearch = /^0x[0-9a-f]{40}$/.test(trimmedSearch);
  const canImport =
    isAddressSearch && sourceTokens.every((token) => token.address !== trimmedSearch);

  const error = sourceTokensError ?? destinationTokensError ?? artifactError;
  const isLoading = !error && !view;

  function flipDirection() {
    setPair((previous) => ({
      sourceChainId: previous.destinationChainId,
      destinationChainId: previous.sourceChainId,
    }));
    setSelectedTokenId(null);
    setDestinationSearch('');
    setIsDestinationPickerOpen(false);
    setImportStatus('idle');
  }

  function handleSelectToken(tokenId: TokenId) {
    setSelectedTokenId(tokenId);
    setDestinationSearch('');
    setIsDestinationPickerOpen(false);
  }

  async function handleImport() {
    setImportStatus('loading');
    try {
      const resolution = await fetchJson<ImportResolution>(
        `/api/token-registry/import/${pair.sourceChainId}/${pair.destinationChainId}/${trimmedSearch}`,
      );
      setOverlays((previous) => ({
        ...previous,
        [currentPairKey]: [...(previous[currentPairKey] ?? []), resolution],
      }));
      setSelectedTokenId(toTokenId(pair.sourceChainId, trimmedSearch));
      setSearch('');
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
      </div>

      {error && <p className="mt-6 text-red-400">Failed to load the registry: {String(error)}</p>}
      {isLoading && !error && <p className="mt-6 text-white/60">Loading registry…</p>}

      {view && (
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <section>
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
                  {importStatus === 'loading' ? 'Resolving via canonical bridge…' : 'Import token'}
                </button>
                {importStatus === 'error' && (
                  <p className="mt-2 text-red-400">
                    Not transferable to {chainNames[pair.destinationChainId]} via the canonical
                    bridge.
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
                selectedTokenId={selectedTokenId}
                onSelect={handleSelectToken}
              />
            </div>
          </section>

          <section>
            {!selectedToken && (
              <p className="text-white/60">Select a source token to see its routes.</p>
            )}

            {selectedToken && (
              <>
                <div className="flex items-center gap-3">
                  <TokenIcon token={selectedToken} />
                  <div>
                    <p className="font-semibold">
                      {selectedToken.symbol}
                      <span className="ml-2 text-sm font-normal text-white/50">
                        {selectedToken.name}
                      </span>
                    </p>
                    <p className="text-xs text-white/40">
                      {isNativeToken(selectedToken) ? 'Native token' : selectedToken.address}
                    </p>
                  </div>
                </div>

                <h2 className="mt-6 text-sm font-semibold uppercase tracking-wide text-white/60">
                  Routes to {chainNames[pair.destinationChainId]}
                </h2>

                {selectedRoutes.length === 0 && (
                  <p className="mt-2 text-white/60">No routes available.</p>
                )}

                <ul className="mt-2 space-y-2">
                  {selectedRoutes.map((route, index) => (
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
                        <DestinationLabel
                          destinationTokenId={route.destinationTokenId}
                          tokens={view.tokens}
                        />
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

                {selectedHasSwapRoute && !isDestinationPickerOpen && (
                  <button
                    onClick={() => setIsDestinationPickerOpen(true)}
                    className="mt-6 rounded-md border border-white/20 px-3 py-1.5 text-sm hover:bg-white/10"
                  >
                    Show destination tokens
                  </button>
                )}

                {selectedHasSwapRoute && isDestinationPickerOpen && !swapDestinationAddresses && (
                  <p className="mt-6 text-sm text-white/50">Loading swap destinations…</p>
                )}

                {selectedHasSwapRoute && isDestinationPickerOpen && swapDestinationAddresses && (
                  <div className="mt-6">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-white/60">
                      {allDestinationTokens.length} destination token
                      {allDestinationTokens.length === 1 ? '' : 's'}
                    </h2>
                    <input
                      value={destinationSearch}
                      onChange={(event) => setDestinationSearch(event.target.value)}
                      placeholder="Search by symbol, name or address"
                      className="mt-2 w-full rounded-md border border-white/20 bg-white/5 px-3 py-2 text-sm outline-none placeholder:text-white/40 focus:border-white/50"
                    />
                    <div className="mt-2">
                      <VirtualizedTokenList tokens={destinationTokens} />
                    </div>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
