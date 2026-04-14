'use client';

import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { useDebounce } from '@uidotdev/usehooks';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { useAccount } from 'wagmi';

import { PageHeading } from '@/app-components/AppShell/components/PageHeading';
import type {
  BalancesResponse,
  MappingProvider,
  RouteCandidate,
  RouteCandidatesResponse,
  TokenVariant,
  TokensResponse,
} from '@/app-lib/token-graph-poc/types';
import { lifiDestinationChainIds } from '@/bridge/app/api/crosschain-transfers/constants';
import { ChainId } from '@/bridge/types/ChainId';

const DEFAULT_SOURCE_CHAIN_ID = 1;
const DEFAULT_DESTINATION_CHAIN_ID = 42161;

const TOKEN_GRAPH_CHAINS = [
  {
    chainId: ChainId.Ethereum,
    name: 'Ethereum',
  },
  {
    chainId: ChainId.ArbitrumOne,
    name: 'Arbitrum One',
  },
  {
    chainId: ChainId.ApeChain,
    name: 'ApeChain',
  },
] as const;

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

function parseChainId(value: string | null, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function buildSourceTokensUrl(sourceChainId: number, destinationChainId: number, q: string) {
  const params = new URLSearchParams({
    chainId: String(sourceChainId),
    destinationChainId: String(destinationChainId),
  });

  if (q.trim()) {
    params.set('q', q.trim());
  }

  return `/api/token-graph-poc/tokens?${params.toString()}`;
}

function buildRouteCandidatesUrl(
  sourceTokenId: string,
  destinationChainId: number,
  q: string,
  includeSwapFallback = false,
) {
  const params = new URLSearchParams({
    destinationChainId: String(destinationChainId),
    token: sourceTokenId,
  });

  if (q.trim()) {
    params.set('q', q.trim());
  }

  if (includeSwapFallback) {
    params.set('includeSwapFallback', 'true');
  }

  return `/api/token-graph-poc/destination?${params.toString()}`;
}

function buildBalancesUrl(chainId: number, walletAddress: string, destinationChainId: number) {
  const params = new URLSearchParams({
    chainId: String(chainId),
    walletAddress,
    destinationChainId: String(destinationChainId),
  });

  return `/api/token-graph-poc/balances?${params.toString()}`;
}

function getVisibleTokens(params: {
  tokensResponse: TokensResponse | undefined;
  balancesResponse: BalancesResponse | undefined;
  isConnected: boolean;
  sourceQuery: string;
}) {
  const { tokensResponse, balancesResponse, isConnected, sourceQuery } = params;

  if (sourceQuery.trim()) {
    return tokensResponse?.items ?? [];
  }

  if (isConnected && balancesResponse) {
    return balancesResponse.items.map((item) => item.token);
  }

  return [];
}

function getMergedRouteCandidates(
  ...responses: Array<RouteCandidatesResponse | undefined>
): RouteCandidatesResponse['items'] {
  const itemsByRouteId = new Map<string, RouteCandidate>();

  for (const response of responses) {
    for (const item of response?.items ?? []) {
      itemsByRouteId.set(item.routeId, item);
    }
  }

  return [...itemsByRouteId.values()].sort((left, right) => {
    return (
      left.bestPriority - right.bestPriority ||
      left.destinationToken.symbol.localeCompare(right.destinationToken.symbol) ||
      left.destinationToken.name.localeCompare(right.destinationToken.name) ||
      left.routeId.localeCompare(right.routeId)
    );
  });
}

function getCachedRouteCandidateResponses(params: {
  cache: ReturnType<typeof useSWRConfig>['cache'];
  destinationChainId: number;
}) {
  const { cache, destinationChainId } = params;
  const responses: RouteCandidatesResponse[] = [];
  const destinationPrefix = `/api/token-graph-poc/destination?destinationChainId=${destinationChainId}`;

  for (const key of cache.keys()) {
    if (typeof key !== 'string' || !key.startsWith(destinationPrefix)) {
      continue;
    }

    const entry = cache.get(key) as { data?: RouteCandidatesResponse } | undefined;
    if (entry?.data) {
      responses.push(entry.data);
    }
  }

  return responses;
}

function ProviderBadge({ provider }: { provider: MappingProvider }) {
  const palette = {
    canonical: 'border-blue-400/40 bg-blue-500/10 text-blue-100',
    cctp: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100',
    lifi: 'border-amber-400/40 bg-amber-500/10 text-amber-100',
    oft: 'border-fuchsia-400/40 bg-fuchsia-500/10 text-fuchsia-100',
  }[provider];

  return (
    <span className={`rounded-full border px-2 py-1 text-[11px] font-medium uppercase ${palette}`}>
      {provider}
    </span>
  );
}

function CapabilityBadge({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] text-white/60">
      {label}
    </span>
  );
}

function RouteCandidateCard({
  candidate,
  selected,
  onSelect,
}: {
  candidate: RouteCandidate;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-xl border p-3 text-left transition ${
        selected
          ? 'border-white/50 bg-white/10'
          : 'border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.06]'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-white">
            {candidate.destinationToken.symbol}
            <span className="ml-2 font-normal text-white/45">{candidate.family}</span>
          </div>
          <div className="text-sm text-white/70">{candidate.destinationToken.name}</div>
        </div>
        <div className="text-xs text-white/45">{candidate.mode}</div>
      </div>

      <div className="mt-3 break-all text-[11px] text-white/45">
        {candidate.destinationToken.address ?? 'native'}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <ProviderBadge provider={candidate.provider} />
        {candidate.capabilities.supportsBatchDeposit && <CapabilityBadge label="batch deposit" />}
        {candidate.mode === 'swap' && <CapabilityBadge label="swap" />}
      </div>
    </button>
  );
}

function TokenCard({
  token,
  balance,
  selected,
  onSelect,
}: {
  token: TokenVariant;
  balance: string | undefined;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-xl border p-3 text-left transition ${
        selected
          ? 'border-white/50 bg-white/10'
          : 'border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.06]'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-white">
            {token.symbol}
            {balance !== undefined && (
              <span className="ml-2 font-normal text-white/50">{balance}</span>
            )}
          </div>
          <div className="text-sm text-white/70">{token.name}</div>
        </div>
        <div className="rounded-full border border-white/10 px-2 py-1 text-[11px] text-white/60">
          {token.tokenType}
        </div>
      </div>
      <div className="mt-3 break-all text-[11px] text-white/45">{token.address ?? 'native'}</div>
    </button>
  );
}

function RouteSummary({
  selectedSourceToken,
  selectedRoute,
  destinationToken,
}: {
  selectedSourceToken: TokenVariant | null;
  selectedRoute: RouteCandidate | null;
  destinationToken: TokenVariant | null;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:p-5">
      <div className="text-sm font-semibold text-white">Bridge-like selectors</div>
      <div className="mt-2 text-sm text-white/60">
        The PoC now resolves explicit route candidates first, then derives destination asset and
        route family directly from the selected candidate instead of inferring route type from token
        addresses.
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <div className="text-xs uppercase tracking-[0.18em] text-white/45">
            selectedSourceToken
          </div>
          <div className="mt-2 text-sm text-white">
            {selectedSourceToken
              ? `${selectedSourceToken.symbol} (${selectedSourceToken.id})`
              : '—'}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <div className="text-xs uppercase tracking-[0.18em] text-white/45">destinationToken</div>
          <div className="mt-2 text-sm text-white">
            {destinationToken ? `${destinationToken.symbol} (${destinationToken.id})` : '—'}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <div className="text-xs uppercase tracking-[0.18em] text-white/45">Selected Family</div>
          <div className="mt-2 text-sm text-white">{selectedRoute?.family ?? '—'}</div>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <div className="text-xs uppercase tracking-[0.18em] text-white/45">Selected Mode</div>
          <div className="mt-2 text-sm text-white">{selectedRoute?.mode ?? '—'}</div>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <div className="text-xs uppercase tracking-[0.18em] text-white/45">
            supportsBatchDeposit
          </div>
          <div className="mt-2 text-sm text-white">
            {String(selectedRoute?.capabilities.supportsBatchDeposit ?? false)}
          </div>
        </div>
      </div>
    </section>
  );
}

export function TokenGraphPocClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { address, isConnected } = useAccount();
  const { cache } = useSWRConfig();
  const [sourceQuery, setSourceQuery] = useState('');
  const [destinationQuery, setDestinationQuery] = useState('');
  const [isDestinationDropdownOpen, setIsDestinationDropdownOpen] = useState(false);
  const [selectedSourceTokenId, setSelectedSourceTokenId] = useState<string | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);

  const sourceChainId = parseChainId(searchParams.get('sourceChainId'), DEFAULT_SOURCE_CHAIN_ID);
  const destinationChainId = parseChainId(
    searchParams.get('destinationChainId'),
    DEFAULT_DESTINATION_CHAIN_ID,
  );
  const debouncedSourceQuery = useDebounce(sourceQuery, 300);
  const debouncedDestinationQuery = useDebounce(destinationQuery, 300);
  const sourceTokensUrl = debouncedSourceQuery.trim()
    ? buildSourceTokensUrl(sourceChainId, destinationChainId, debouncedSourceQuery)
    : null;
  const { data: sourceTokensResponse, isLoading: sourceTokensAreLoading } = useSWR<TokensResponse>(
    sourceTokensUrl,
    fetchJson,
  );
  const sourceBalancesUrl = address
    ? buildBalancesUrl(sourceChainId, address, destinationChainId)
    : null;
  const { data: balancesResponse, isLoading: balancesAreLoading } = useSWR<BalancesResponse>(
    sourceBalancesUrl,
    fetchJson,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );
  const balanceByTokenId = new Map(
    (balancesResponse?.items ?? []).map((item) => [item.token.id, item.balance]),
  );
  const visibleTokens = getVisibleTokens({
    tokensResponse: sourceTokensResponse,
    balancesResponse,
    isConnected,
    sourceQuery: debouncedSourceQuery,
  });
  const selectedSourceToken = useMemo(
    () => visibleTokens.find((token) => token.id === selectedSourceTokenId) ?? null,
    [selectedSourceTokenId, visibleTokens],
  );

  useEffect(() => {
    setDestinationQuery('');
    setIsDestinationDropdownOpen(false);
    setSelectedRouteId(null);
  }, [selectedSourceTokenId, destinationChainId]);

  const sourceLoadedTokenIds = new Set<string>();
  for (const item of balancesResponse?.items ?? []) {
    sourceLoadedTokenIds.add(item.token.id);
  }
  const sourceTokensPrefix = `/api/token-graph-poc/tokens?chainId=${sourceChainId}`;
  for (const key of cache.keys()) {
    if (typeof key !== 'string' || !key.startsWith(sourceTokensPrefix)) {
      continue;
    }

    const entry = cache.get(key) as { data?: TokensResponse } | undefined;
    for (const token of entry?.data?.items ?? []) {
      sourceLoadedTokenIds.add(token.id);
    }
  }
  const sourceLoadedCount = sourceLoadedTokenIds.size;

  const canLoadSwapFallback =
    !!selectedSourceToken?.supportsSwap &&
    (lifiDestinationChainIds[sourceChainId] ?? []).includes(destinationChainId);

  const directRouteCandidatesUrl = selectedSourceTokenId
    ? buildRouteCandidatesUrl(selectedSourceTokenId, destinationChainId, '')
    : null;
  const { data: directRouteCandidatesResponse, isLoading: directRouteCandidatesAreLoading } =
    useSWR<RouteCandidatesResponse>(directRouteCandidatesUrl, fetchJson);

  const swapRouteCandidatesUrl =
    isDestinationDropdownOpen &&
    selectedSourceTokenId &&
    canLoadSwapFallback &&
    !debouncedDestinationQuery.trim()
      ? buildRouteCandidatesUrl(selectedSourceTokenId, destinationChainId, '', true)
      : null;
  const { data: swapRouteCandidatesResponse, isLoading: swapRouteCandidatesAreLoading } =
    useSWR<RouteCandidatesResponse>(swapRouteCandidatesUrl, fetchJson);

  const swapRouteCandidatesSearchUrl =
    isDestinationDropdownOpen &&
    selectedSourceTokenId &&
    canLoadSwapFallback &&
    debouncedDestinationQuery.trim()
      ? buildRouteCandidatesUrl(
          selectedSourceTokenId,
          destinationChainId,
          debouncedDestinationQuery,
          true,
        )
      : null;
  const {
    data: swapRouteCandidatesSearchResponse,
    isLoading: swapRouteCandidatesSearchAreLoading,
  } = useSWR<RouteCandidatesResponse>(swapRouteCandidatesSearchUrl, fetchJson);

  const cachedRouteCandidateResponses = getCachedRouteCandidateResponses({
    cache,
    destinationChainId,
  });
  const loadedRouteCandidates = getMergedRouteCandidates(
    ...cachedRouteCandidateResponses,
    directRouteCandidatesResponse,
    swapRouteCandidatesResponse,
    swapRouteCandidatesSearchResponse,
  );
  const directRouteCandidates = useMemo(
    () => directRouteCandidatesResponse?.items ?? [],
    [directRouteCandidatesResponse?.items],
  );
  const swapRouteCandidates = useMemo(
    () =>
      (debouncedDestinationQuery.trim()
        ? swapRouteCandidatesSearchResponse?.items
        : swapRouteCandidatesResponse?.items) ?? [],
    [
      debouncedDestinationQuery,
      swapRouteCandidatesResponse?.items,
      swapRouteCandidatesSearchResponse?.items,
    ],
  );
  const availableSwapRouteCandidates = swapRouteCandidates.filter(
    (candidate) => candidate.mode === 'swap',
  );
  const hasDirectRouteCandidates = directRouteCandidates.length > 0;
  const isLifiOnlyDestinationSelection = !hasDirectRouteCandidates && canLoadSwapFallback;
  const routeCandidatesAreLoading = !!selectedSourceTokenId && directRouteCandidatesAreLoading;
  const swapRouteListIsLoading = debouncedDestinationQuery.trim()
    ? swapRouteCandidatesSearchAreLoading
    : swapRouteCandidatesAreLoading;
  const shouldShowSwapToButton = !!selectedSourceTokenId && canLoadSwapFallback;
  const loadedCandidateCount = loadedRouteCandidates.length;

  const selectableRouteCandidates = useMemo(
    () => [...directRouteCandidates, ...availableSwapRouteCandidates],
    [availableSwapRouteCandidates, directRouteCandidates],
  );

  useEffect(() => {
    if (!selectableRouteCandidates.length) {
      setSelectedRouteId(null);
      return;
    }

    const hasSelectedCandidate = selectableRouteCandidates.some(
      (candidate) => candidate.routeId === selectedRouteId,
    );

    if (!hasSelectedCandidate) {
      setSelectedRouteId(selectableRouteCandidates[0]?.routeId ?? null);
    }
  }, [selectableRouteCandidates, selectedRouteId]);

  const selectedRoute = useMemo(
    () =>
      selectableRouteCandidates.find((candidate) => candidate.routeId === selectedRouteId) ?? null,
    [selectableRouteCandidates, selectedRouteId],
  );
  const destinationToken = selectedRoute?.destinationToken ?? null;

  const toggleDestinationDropdown = () => {
    setIsDestinationDropdownOpen((value) => !value);
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-8">
      <div className="space-y-3">
        <h1 className="text-2xl font-bold text-white md:hidden">Token Graph PoC</h1>
        <PageHeading>Token Graph PoC</PageHeading>
        <div className="max-w-3xl text-sm leading-6 text-white/70">
          This version models bridge selection as graph-backed assets plus explicit route
          candidates. The frontend no longer needs to guess route family from token addresses once a
          candidate is selected.
        </div>
        <div className="text-xs text-white/55">Route: `/token-graph-poc`</div>
      </div>

      <RouteSummary
        selectedSourceToken={selectedSourceToken}
        selectedRoute={selectedRoute}
        destinationToken={destinationToken}
      />

      <div className="space-y-6">
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:p-5">
          <div className="grid gap-4 lg:grid-cols-2">
            <label className="space-y-2">
              <div className="text-xs uppercase tracking-[0.18em] text-white/45">Source chain</div>
              <select
                value={sourceChainId}
                onChange={(event) => {
                  const params = new URLSearchParams(searchParams.toString());
                  params.set('sourceChainId', event.target.value);
                  if (Number(event.target.value) === destinationChainId) {
                    params.set('destinationChainId', String(sourceChainId));
                  }
                  setSelectedSourceTokenId(null);
                  router.replace(`${pathname}?${params.toString()}`, { scroll: false });
                }}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-sm text-white outline-none transition focus:border-white/30"
              >
                {TOKEN_GRAPH_CHAINS.map((chain) => (
                  <option key={chain.chainId} value={chain.chainId}>
                    {chain.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <div className="text-xs uppercase tracking-[0.18em] text-white/45">
                Destination chain
              </div>
              <select
                value={destinationChainId}
                onChange={(event) => {
                  const params = new URLSearchParams(searchParams.toString());
                  params.set('destinationChainId', event.target.value);
                  router.replace(`${pathname}?${params.toString()}`, { scroll: false });
                }}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-sm text-white outline-none transition focus:border-white/30"
              >
                {TOKEN_GRAPH_CHAINS.filter((chain) => chain.chainId !== sourceChainId).map(
                  (chain) => (
                    <option key={chain.chainId} value={chain.chainId}>
                      {chain.name}
                    </option>
                  ),
                )}
              </select>
            </label>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-white">1. Source assets</div>
                <div className="text-xs text-white/55">`GET /api/token-graph-poc/balances`</div>
              </div>
              <div className="rounded-full border border-white/10 px-2 py-1 text-[11px] text-white/55">
                {sourceLoadedCount} loaded
              </div>
            </div>

            <input
              value={sourceQuery}
              onChange={(event) => setSourceQuery(event.target.value)}
              placeholder="Filter source assets by symbol, name, address, or asset id"
              className="mt-4 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-white/30"
            />

            <div className="mt-4 space-y-3">
              {sourceTokensAreLoading || (!debouncedSourceQuery.trim() && balancesAreLoading) ? (
                <div className="rounded-xl border border-dashed border-white/10 p-4 text-sm text-white/50">
                  Loading source assets...
                </div>
              ) : visibleTokens.length ? (
                visibleTokens.map((token) => (
                  <TokenCard
                    key={token.id}
                    token={token}
                    balance={balanceByTokenId.get(token.id)}
                    selected={token.id === selectedSourceTokenId}
                    onSelect={() => {
                      setSelectedSourceTokenId(token.id);
                    }}
                  />
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-white/10 p-4 text-sm text-white/50">
                  {!isConnected
                    ? 'Connect a wallet to load source assets from balances.'
                    : sourceQuery.trim()
                      ? 'No assets match this query.'
                      : 'No assets with balance on this chain.'}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-white">2. Route candidates</div>
                <div className="text-xs text-white/55">
                  Candidates include route family, destination asset, and capabilities
                </div>
              </div>
              <div className="rounded-full border border-white/10 px-2 py-1 text-[11px] text-white/55">
                {loadedCandidateCount} loaded
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {!selectedSourceToken ? (
                <div className="rounded-xl border border-dashed border-white/10 p-4 text-sm text-white/50">
                  Select a source asset first.
                </div>
              ) : routeCandidatesAreLoading ? (
                <div className="rounded-xl border border-dashed border-white/10 p-4 text-sm text-white/50">
                  Loading route candidates...
                </div>
              ) : isLifiOnlyDestinationSelection ? (
                <>
                  <button
                    type="button"
                    onClick={toggleDestinationDropdown}
                    className={`w-full rounded-xl border p-3 text-left transition ${
                      isDestinationDropdownOpen
                        ? 'border-white/50 bg-white/10'
                        : 'border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.06]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-white">Load LiFi candidates</div>
                        <div className="text-sm text-white/60">
                          {isDestinationDropdownOpen
                            ? `${availableSwapRouteCandidates.length} candidate(s)`
                            : 'This source asset needs a swap destination selection'}
                        </div>
                      </div>
                      <ChevronDownIcon
                        width={14}
                        className={isDestinationDropdownOpen ? 'rotate-180' : ''}
                      />
                    </div>
                  </button>

                  {isDestinationDropdownOpen && (
                    <>
                      <input
                        value={destinationQuery}
                        onChange={(event) => setDestinationQuery(event.target.value)}
                        placeholder="Filter swap destination assets"
                        className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-white/30"
                      />

                      {swapRouteListIsLoading ? (
                        <div className="rounded-xl border border-dashed border-white/10 p-4 text-sm text-white/50">
                          Loading LiFi candidates...
                        </div>
                      ) : availableSwapRouteCandidates.length ? (
                        availableSwapRouteCandidates.map((candidate) => (
                          <RouteCandidateCard
                            key={candidate.routeId}
                            candidate={candidate}
                            selected={candidate.routeId === selectedRouteId}
                            onSelect={() => setSelectedRouteId(candidate.routeId)}
                          />
                        ))
                      ) : (
                        <div className="rounded-xl border border-dashed border-white/10 p-4 text-sm text-white/50">
                          {debouncedDestinationQuery.trim()
                            ? 'No LiFi candidates match this query.'
                            : 'No LiFi candidates available.'}
                        </div>
                      )}
                    </>
                  )}
                </>
              ) : directRouteCandidates.length ? (
                <>
                  {directRouteCandidates.map((candidate) => (
                    <RouteCandidateCard
                      key={candidate.routeId}
                      candidate={candidate}
                      selected={candidate.routeId === selectedRouteId}
                      onSelect={() => setSelectedRouteId(candidate.routeId)}
                    />
                  ))}

                  {shouldShowSwapToButton && (
                    <>
                      <button
                        type="button"
                        onClick={toggleDestinationDropdown}
                        className={`w-full rounded-xl border p-3 text-left transition ${
                          isDestinationDropdownOpen
                            ? 'border-white/50 bg-white/10'
                            : 'border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.06]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-white">
                              Load swap alternatives
                            </div>
                            <div className="text-sm text-white/60">
                              {isDestinationDropdownOpen
                                ? `${availableSwapRouteCandidates.length} extra candidate(s)`
                                : 'LiFi swap routes for a different destination asset'}
                            </div>
                          </div>
                          <ChevronDownIcon
                            width={14}
                            className={isDestinationDropdownOpen ? 'rotate-180' : ''}
                          />
                        </div>
                      </button>

                      {isDestinationDropdownOpen && (
                        <>
                          <input
                            value={destinationQuery}
                            onChange={(event) => setDestinationQuery(event.target.value)}
                            placeholder="Filter swap destination assets"
                            className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-white/30"
                          />

                          {swapRouteListIsLoading ? (
                            <div className="rounded-xl border border-dashed border-white/10 p-4 text-sm text-white/50">
                              Loading swap alternatives...
                            </div>
                          ) : availableSwapRouteCandidates.length ? (
                            availableSwapRouteCandidates.map((candidate) => (
                              <RouteCandidateCard
                                key={candidate.routeId}
                                candidate={candidate}
                                selected={candidate.routeId === selectedRouteId}
                                onSelect={() => setSelectedRouteId(candidate.routeId)}
                              />
                            ))
                          ) : (
                            <div className="rounded-xl border border-dashed border-white/10 p-4 text-sm text-white/50">
                              {debouncedDestinationQuery.trim()
                                ? 'No swap alternatives match this query.'
                                : 'No swap alternatives.'}
                            </div>
                          )}
                        </>
                      )}
                    </>
                  )}
                </>
              ) : (
                <div className="rounded-xl border border-dashed border-white/10 p-4 text-sm text-white/50">
                  No reachable route candidates for this source asset and destination chain.
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
