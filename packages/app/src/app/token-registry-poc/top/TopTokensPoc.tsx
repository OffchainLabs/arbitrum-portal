'use client';

import { getBalance } from '@wagmi/core';
import dynamic from 'next/dynamic';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import useSWR, { preload, useSWRConfig } from 'swr';
import { isAddress } from 'viem';
import { useAccount } from 'wagmi';

import {
  DEFAULT_SELECTION,
  DestinationOption,
  DestinationSelection,
  HeldTokens,
  RegistryIndexFile,
  Selection,
  TOKEN_REGISTRY_URL,
  TokenList,
  TopFile,
  TopToken,
  addRecentToken,
  mergePickerTokens,
  tokenKey,
} from '@/app/src/token-registry/registryFiles';
import { NATIVE_TOKEN_ADDRESS } from '@/app/src/token-registry/types';
import { getBridgeUiConfigForChain } from '@/bridge/util/bridgeUiConfig';
import {
  DestinationTokenQueryParam,
  TokenQueryParam,
  decodeChainQueryParam,
  encodeChainQueryParam,
} from '@/bridge/util/queryParamUtils';
import { wagmiConfig } from '@/bridge/util/wagmi/setup';

import { DemoBridge } from './DemoBridge';
import { SwrKey, TokenPicker, fetchJson } from './TokenPicker';
import { transitionPicker } from './pickerTransition';

const TOP_FILE_KEY: SwrKey = [`${TOKEN_REGISTRY_URL}/top.json`, 'token-registry-top'];
const INDEX_FILE_KEY: SwrKey = [`${TOKEN_REGISTRY_URL}/index.json`, 'token-registry-index'];
const API = '/api/token-registry/files';

async function fetchSelectedBalance([, owner, chainId, tokenAddress]: readonly [
  string,
  string,
  number,
  string,
]) {
  if (!isAddress(owner) || !isAddress(tokenAddress))
    throw new Error('Invalid wallet or token address.');
  const balance = await getBalance(wagmiConfig, {
    address: owner,
    chainId,
    token: tokenAddress === NATIVE_TOKEN_ADDRESS ? undefined : tokenAddress,
  });
  return balance.value.toString();
}

type SelectionQuery = {
  sourceChainId: number;
  sourceToken: string;
  destinationChainId?: number;
  destinationToken?: string;
};

function parseSelectionQuery(params: URLSearchParams): SelectionQuery {
  return {
    sourceChainId:
      decodeChainQueryParam(params.get('sourceChain')) ?? DEFAULT_SELECTION.sourceChainId,
    sourceToken: TokenQueryParam.decode(params.get('token'))?.toLowerCase() ?? NATIVE_TOKEN_ADDRESS,
    destinationChainId: decodeChainQueryParam(params.get('destinationChain')),
    destinationToken: DestinationTokenQueryParam.decode(
      params.get('destinationToken'),
    )?.toLowerCase(),
  };
}

function selectionKey(query: SelectionQuery): SwrKey {
  const params = new URLSearchParams({
    sourceChainId: String(query.sourceChainId),
    sourceToken: query.sourceToken,
  });
  if (query.destinationChainId !== undefined)
    params.set('destinationChainId', String(query.destinationChainId));
  if (query.destinationToken) params.set('destinationToken', query.destinationToken);
  return [`${API}/selection?${params}`, 'selection'];
}

function sourceSearchKey(chainId: number | null, query: string): SwrKey | null {
  if (query.trim().length < 2) return null;
  const params = new URLSearchParams({ q: query });
  if (chainId !== null) params.set('chainId', String(chainId));
  return [`${API}/search?${params}`, 'source-search'];
}

function destinationKey(source: TopToken, chainId: number | null, query?: string): SwrKey {
  const params = new URLSearchParams({
    sourceChainId: String(source.chainId),
    sourceToken: source.address,
  });
  if (chainId !== null) params.set('destinationChainId', String(chainId));
  if (query) params.set('q', query);
  return [`${API}/destination-tokens?${params}`, 'destinations'];
}

type EligibilityKey = readonly [
  string,
  number,
  string,
  Pick<TopToken, 'chainId' | 'address'>[],
  string,
];

async function fetchEligibility([
  url,
  sourceChainId,
  sourceToken,
  candidates,
]: EligibilityKey): Promise<TokenList<DestinationOption>> {
  const batches = Array.from({ length: Math.ceil(candidates.length / 200) }, (_, index) =>
    candidates.slice(index * 200, (index + 1) * 200),
  );
  const results = await Promise.all(
    batches.map(async (batch) => {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceChainId,
          sourceToken,
          candidates: batch,
        }),
      });
      if (!response.ok) throw new Error(`Eligibility check failed (${response.status})`);
      const result: TokenList<DestinationOption> = await response.json();
      return result.tokens;
    }),
  );
  return { tokens: mergePickerTokens(...results), isComplete: true };
}

const WalletProviders = dynamic(
  () => import('./WalletProviders').then((mod) => mod.WalletProviders),
  { ssr: false },
);

export function TopTokensPoc() {
  return (
    <WalletProviders>
      <TopTokensPocContent />
    </WalletProviders>
  );
}

function TopTokensPocContent() {
  const { mutate } = useSWRConfig();
  const pathname = usePathname();
  const params = useSearchParams();
  const { address } = useAccount();
  const urlQuery = params.toString();
  const [query, setQuery] = useState(() => parseSelectionQuery(new URLSearchParams(urlQuery)));
  useEffect(() => {
    setQuery(parseSelectionQuery(new URLSearchParams(urlQuery)));
  }, [urlQuery]);
  const [openPicker, setOpenPicker] = useState<'source' | 'destination' | null>(null);
  const [needsTop, setNeedsTop] = useState(false);
  const [filters, setFilters] = useState<{ source: number | null; destination: number | null }>({
    source: null,
    destination: null,
  });
  const { data: prices = {} } = useSWR(
    [`${API}/prices`, 'prices'] as const,
    fetchJson<Record<string, number>>,
    { refreshInterval: 60_000 },
  );
  const [needsIndex, setNeedsIndex] = useState(false);
  const [sourceRecents, setSourceRecents] = useState<TopToken[]>([]);
  const [destinationRecents, setDestinationRecents] = useState<DestinationOption[]>([]);
  const [pendingSource, setPendingSource] = useState<TopToken>();
  const [inspectionInput, setInspectionInput] = useState('');
  const [inspectionAddress, setInspectionAddress] = useState<string>();
  const [inspectionError, setInspectionError] = useState('');
  const [resolvingDestination, setResolvingDestination] = useState(false);
  const [destinationError, setDestinationError] = useState('');
  const [sourceNotice, setSourceNotice] = useState<{
    source: string;
    destination: string;
    message: string;
  }>();
  const resolutionAttempt = useRef(0);
  useEffect(() => {
    const cancelSelection = () => {
      resolutionAttempt.current += 1;
      setPendingSource(undefined);
      setResolvingDestination(false);
      setDestinationError('');
    };
    window.addEventListener('popstate', cancelSelection);
    return () => window.removeEventListener('popstate', cancelSelection);
  }, []);
  const {
    data: selection,
    error: selectionError,
    mutate: retrySelection,
  } = useSWR(selectionKey(query), fetchJson<Selection>, { keepPreviousData: true });
  const {
    data: top,
    error: topError,
    mutate: retryTop,
  } = useSWR(needsTop ? TOP_FILE_KEY : null, fetchJson<TopFile>);
  const {
    data: index,
    error: indexError,
    mutate: retryIndex,
  } = useSWR(needsIndex ? INDEX_FILE_KEY : null, fetchJson<RegistryIndexFile>);
  const balanceAddress = inspectionAddress ?? address;
  const {
    data: holdings,
    error: balanceError,
    isValidating: refreshingBalances,
    mutate: refreshBalances,
  } = useSWR(
    balanceAddress
      ? ([
          `${API}/balances?${new URLSearchParams({ address: balanceAddress })}`,
          'balances',
        ] as const)
      : null,
    fetchJson<HeldTokens>,
    { refreshInterval: 60_000 },
  );
  const balances = new Map(
    (holdings?.tokens ?? []).map((token) => [tokenKey(token), token.balance]),
  );
  const source = pendingSource ?? selection?.sourceToken;
  const destination = pendingSource ? undefined : selection?.destinationToken;
  const selectedBalanceKey = (token: TopToken | undefined) =>
    address && token
      ? (['selected-balance', address, token.chainId, token.address] as const)
      : null;
  const {
    data: sourceBalance,
    error: sourceBalanceError,
    isLoading: sourceBalanceLoading,
  } = useSWR(selectedBalanceKey(source), fetchSelectedBalance, { refreshInterval: 15_000 });
  const { data: destinationBalance } = useSWR(
    selectedBalanceKey(destination),
    fetchSelectedBalance,
    { refreshInterval: 15_000 },
  );
  const signingBalances = new Map<string, string>();
  if (source && sourceBalance !== undefined) signingBalances.set(tokenKey(source), sourceBalance);
  if (destination && destinationBalance !== undefined)
    signingBalances.set(tokenKey(destination), destinationBalance);
  const candidates = mergePickerTokens<TopToken>(holdings?.tokens ?? [], destinationRecents).map(
    ({ chainId, address }) => ({ chainId, address }),
  );
  const eligibilityKey: EligibilityKey | null =
    openPicker === 'destination' && source && candidates.length
      ? [
          `${API}/destination-tokens`,
          source.chainId,
          source.address,
          candidates,
          'destination-eligibility',
        ]
      : null;
  const {
    data: eligible,
    error: eligibleError,
    isLoading: checkingEligibility,
  } = useSWR(eligibilityKey, fetchEligibility);
  const chains = index?.chains ?? [];
  const name = (chainId: number) =>
    chains.find((chain) => chain.chainId === chainId)?.name ??
    getBridgeUiConfigForChain(chainId).network.name;

  useEffect(() => {
    if (
      pendingSource &&
      selection?.sourceToken &&
      tokenKey(selection.sourceToken) === tokenKey(pendingSource)
    )
      setPendingSource(undefined);
  }, [pendingSource, selection]);

  // A destination without an address asks the backend for the default token on that chain.
  function selectionParams(
    nextSource: TopToken,
    nextDestination?: { chainId: number; address?: string },
  ) {
    const next = new URLSearchParams(params.toString());
    next.set(
      'sourceChain',
      encodeChainQueryParam(nextSource.chainId) ?? String(nextSource.chainId),
    );
    if (nextSource.address === NATIVE_TOKEN_ADDRESS) next.delete('token');
    else next.set('token', TokenQueryParam.encode(nextSource.address) ?? nextSource.address);
    if (nextDestination) {
      next.set(
        'destinationChain',
        encodeChainQueryParam(nextDestination.chainId) ?? String(nextDestination.chainId),
      );
      if (nextDestination.address)
        next.set(
          'destinationToken',
          DestinationTokenQueryParam.encode(nextDestination.address) ?? nextDestination.address,
        );
      else next.delete('destinationToken');
    } else {
      next.delete('destinationChain');
      next.delete('destinationToken');
    }
    return next;
  }

  function writeSelection(
    nextSource: TopToken,
    nextDestination?: { chainId: number; address?: string },
  ) {
    const next = selectionParams(nextSource, nextDestination);
    setQuery(parseSelectionQuery(next));
    window.history.replaceState(null, '', `${pathname}?${next}`);
  }

  function openSource() {
    resolutionAttempt.current += 1;
    setNeedsTop(true);
    setNeedsIndex(true);
    transitionPicker(() => setOpenPicker('source'));
  }

  function pickSource(token: TopToken) {
    resolutionAttempt.current += 1;
    setSourceNotice(undefined);
    setSourceRecents((recents) => addRecentToken(recents, token));
    setResolvingDestination(false);
    setDestinationError('');
    // Picking the destination token swaps the sides. The URL names the destination token only when
    // the user picked it, and that pick stays when the new source reaches it. Otherwise the backend
    // picks the default token on the same destination chain.
    const destinationPicked =
      destination && query.destinationToken === destination.address.toLowerCase();
    const nextDestination =
      destination && tokenKey(token) === tokenKey(destination)
        ? source
        : destinationPicked
          ? destination
          : destination && { chainId: destination.chainId };
    transitionPicker(() => {
      setPendingSource(token);
      setOpenPicker(null);
      writeSelection(token, nextDestination);
    });
  }

  async function resolveDestination(token: TopToken): Promise<DestinationSelection> {
    if (!source) throw new Error('No source token.');
    const swap = destination && tokenKey(source) === tokenKey(token);
    // A token from the current source's destination lists already carries its providers, so the
    // current source reaches it. Only other tokens need the backend to check or change the source.
    const { providers } = token as Partial<DestinationOption>;
    if (!swap && providers?.length) {
      return {
        kind: 'resolved',
        sourceToken: source,
        destinationToken: token as DestinationOption,
        sourceChanged: false,
      };
    }
    setResolvingDestination(true);
    const response = await fetch(`${API}/selection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceChainId: swap ? destination.chainId : source.chainId,
        sourceTokenAddress: swap ? destination.address : source.address,
        destinationChainId: token.chainId,
        destinationTokenAddress: token.address,
      }),
    });
    if (!response.ok) throw new Error('Could not check routes. Select the token again to retry.');
    return response.json();
  }

  async function pickDestination(token: TopToken) {
    if (!source) return;
    const attempt = ++resolutionAttempt.current;
    setDestinationError('');
    try {
      const result = await resolveDestination(token);
      if (attempt !== resolutionAttempt.current) return;
      if (result.kind === 'unavailable') {
        setDestinationError(`${token.symbol} on ${name(token.chainId)}: ${result.reason}`);
        return;
      }
      const nextKey = selectionKey({
        sourceChainId: result.sourceToken.chainId,
        sourceToken: result.sourceToken.address,
        destinationChainId: result.destinationToken.chainId,
        destinationToken: result.destinationToken.address,
      });
      const nextSelection = await fetchJson<Selection>(nextKey);
      if (attempt !== resolutionAttempt.current) return;
      // The selection can fall back to another destination if the registry changed since the
      // pick. Commit only when it holds both resolved tokens.
      if (
        !nextSelection.sourceToken ||
        !nextSelection.destinationToken ||
        tokenKey(nextSelection.sourceToken) !== tokenKey(result.sourceToken) ||
        tokenKey(nextSelection.destinationToken) !== tokenKey(result.destinationToken)
      ) {
        setDestinationError(
          `The route to ${token.symbol} on ${name(token.chainId)} changed. Select the token again.`,
        );
        return;
      }
      await mutate(nextKey, nextSelection, { revalidate: false });
      if (attempt !== resolutionAttempt.current) return;
      transitionPicker(() => {
        if (attempt !== resolutionAttempt.current) return;
        setDestinationRecents((recents) => addRecentToken(recents, result.destinationToken));
        setPendingSource(undefined);
        setSourceNotice(
          result.sourceChanged
            ? {
                source: tokenKey(result.sourceToken),
                destination: tokenKey(result.destinationToken),
                message: `${source.symbol} on ${name(source.chainId)} cannot reach this destination. Source changed to ${result.sourceToken.symbol} on ${name(result.sourceToken.chainId)} to receive ${result.destinationToken.symbol} on ${name(result.destinationToken.chainId)}.`,
              }
            : undefined,
        );
        setOpenPicker(null);
        writeSelection(result.sourceToken, result.destinationToken);
      });
    } catch {
      if (attempt === resolutionAttempt.current)
        setDestinationError('Could not check routes. Select the token again to retry.');
    } finally {
      if (attempt === resolutionAttempt.current) setResolvingDestination(false);
    }
  }

  function closePicker() {
    resolutionAttempt.current += 1;
    setResolvingDestination(false);
    setDestinationError('');
    transitionPicker(() => setOpenPicker(null));
  }

  const pickerError = indexError || topError;
  const metadataReady = Boolean(index && top);
  return (
    <DemoBridge
      source={source}
      destination={destination}
      balances={signingBalances}
      prices={prices}
      balancesLoading={Boolean(address) && sourceBalanceLoading}
      balanceFailed={Boolean(sourceBalanceError)}
      pickerOpen={Boolean(openPicker)}
      onClosePicker={closePicker}
      onOpenSource={openSource}
      onOpenDestination={() => {
        setNeedsIndex(true);
        setNeedsTop(true);
        setDestinationError('');
        transitionPicker(() => setOpenPicker('destination'));
      }}
      onIntent={() => {
        void preload(TOP_FILE_KEY, fetchJson<TopFile>);
        void preload(INDEX_FILE_KEY, fetchJson<RegistryIndexFile>);
      }}
      onReverse={() => {
        if (source && destination) writeSelection(destination, source);
      }}
      notice={
        <>
          {' '}
          {!selection && !selectionError && (
            <p role="status" className="mt-3 text-sm text-white/50">
              Resolving selection…
            </p>
          )}
          {selectionError && (
            <p role="alert" className="mt-3 text-sm text-red-300">
              Could not resolve this selection.{' '}
              <button type="button" className="underline" onClick={() => void retrySelection()}>
                Retry
              </button>
            </p>
          )}
          {selection && !source && (
            <p role="status" className="mt-3 text-sm text-amber-300">
              This token is unavailable. Choose a source token or look it up by address.
            </p>
          )}
          {source && selection?.destinationChains.length === 0 && (
            <p role="status" className="mt-3 text-sm text-amber-300">
              No supported destination for this token.
            </p>
          )}
          {selection?.adjustment && (
            <p role="status" className="mt-3 text-sm text-amber-300">
              {selection.adjustment.message}
            </p>
          )}
          {source &&
            destination &&
            sourceNotice?.source === tokenKey(source) &&
            sourceNotice.destination === tokenKey(destination) && (
              <p role="status" className="mt-3 text-sm text-amber-300">
                {sourceNotice.message}
              </p>
            )}
        </>
      }
      inspection={
        <>
          {' '}
          <section className="mt-5 rounded-xl border border-white/10 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium">Balances</h2>
              {balanceAddress && (
                <button
                  type="button"
                  disabled={refreshingBalances}
                  onClick={() => void refreshBalances()}
                  className="text-xs text-sky-300 disabled:opacity-50"
                >
                  {refreshingBalances ? 'Refreshing…' : 'Refresh balances'}
                </button>
              )}
            </div>
            <p role="status" className="mt-2 text-xs text-white/60">
              {!balanceAddress
                ? 'Connect a wallet or inspect an address to see held tokens.'
                : balanceError
                  ? 'Could not load balances. Retry with Refresh balances.'
                  : !holdings
                    ? 'Reading balances from the registry chains…'
                    : `${holdings.tokens.length} held tokens${inspectionAddress ? ' · Read-only address inspection' : ''}`}
            </p>
            {holdings?.failedChainIds.length ? (
              <p className="mt-2 text-xs text-amber-300">
                Balances unavailable on {holdings.failedChainIds.map(name).join(', ')}. These
                balances are unknown, not zero.
              </p>
            ) : null}
            {balanceAddress && (
              <p className="mt-1 break-all font-mono text-[11px] text-white/40">{balanceAddress}</p>
            )}
            <details className="mt-3 text-xs text-white/60">
              <summary className="cursor-pointer">
                Inspect a real address without connecting
              </summary>
              <form
                className="mt-2 flex gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!isAddress(inspectionInput.trim())) {
                    setInspectionError('Enter a valid EVM address.');
                    return;
                  }
                  setInspectionAddress(inspectionInput.trim().toLowerCase());
                  setInspectionError('');
                }}
              >
                <input
                  aria-label="Address to inspect"
                  value={inspectionInput}
                  onChange={(event) => setInspectionInput(event.target.value)}
                  placeholder="0x…"
                  className="min-w-0 flex-1 rounded bg-white/5 p-2 font-mono"
                />
                <button type="submit" className="rounded bg-white/10 px-3">
                  Inspect
                </button>
                {inspectionAddress && (
                  <button
                    type="button"
                    onClick={() => {
                      setInspectionAddress(undefined);
                      setInspectionInput('');
                    }}
                  >
                    Clear
                  </button>
                )}
              </form>
              {inspectionError && (
                <p role="alert" className="mt-2 text-amber-300">
                  {inspectionError}
                </p>
              )}
            </details>
          </section>
          <details className="mt-4 text-xs text-white/50">
            <summary className="cursor-pointer">Technical evidence</summary>
            <div className="mt-2 space-y-1">
              <div>
                Selection:{' '}
                <a
                  className="break-all text-sky-300"
                  href={selectionKey(query)[0]}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open API response
                </a>
              </div>
              {source && (
                <div>
                  Destinations:{' '}
                  <a
                    className="text-sky-300"
                    href={destinationKey(source, null)[0]}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open eligible tokens
                  </a>
                </div>
              )}
              <div>
                Registry:{' '}
                <a
                  className="break-all text-sky-300"
                  href={`${TOKEN_REGISTRY_URL}/index.json`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Published index
                </a>
              </div>
              {top && (
                <div>
                  {top.tokens.length} top tokens · Generated{' '}
                  {new Date(top.generatedAt).toLocaleString()}
                </div>
              )}
            </div>
            <p className="mt-2">
              Recents last for this page session. Prices come from the live provider registry.
              Networks and assets come from the published registry; missing prices and failed
              balance requests remain unknown.
            </p>
          </details>
        </>
      }
      picker={
        <>
          {' '}
          {openPicker && !metadataReady && (
            <div role="status" className="mt-4 rounded border border-white/20 p-4 text-sm">
              {pickerError ? (
                <>
                  Could not load picker data.{' '}
                  <button
                    type="button"
                    className="text-sky-300"
                    onClick={() => {
                      void retryTop();
                      void retryIndex();
                    }}
                  >
                    Retry
                  </button>
                </>
              ) : (
                'Loading networks and tokens…'
              )}
              <button type="button" className="ml-4 text-white/50" onClick={closePicker}>
                Cancel
              </button>
            </div>
          )}
          {openPicker === 'source' && metadataReady && (
            <TokenPicker<TopToken>
              key="source"
              title="Bridge from"
              failedBalanceChainIds={holdings?.failedChainIds}
              chains={chains}
              initialChainId={filters.source}
              onFilterChange={(chainId) =>
                setFilters((current) => ({ ...current, source: chainId }))
              }
              prices={prices}
              selectedToken={source}
              balances={balances}
              localTokens={top?.tokens ?? []}
              extraTokens={holdings?.tokens ?? []}
              recents={sourceRecents}
              top={top}
              getSearchKey={sourceSearchKey}
              onSelect={pickSource}
              onClose={closePicker}
            />
          )}
          {openPicker === 'destination' && metadataReady && source && selection && (
            <TokenPicker<TopToken>
              key={`destination-${tokenKey(source)}`}
              title="Bridge to"
              failedBalanceChainIds={holdings?.failedChainIds}
              chains={chains}
              initialChainId={filters.destination}
              onFilterChange={(chainId) =>
                setFilters((current) => ({ ...current, destination: chainId }))
              }
              prices={prices}
              selectedToken={destination}
              balances={balances}
              localTokens={mergePickerTokens<TopToken>(
                (pendingSource ? [] : selection.destinationChains).flatMap((chain) =>
                  chain.canonicalToken ? [chain.canonicalToken] : [],
                ),
                top?.tokens ?? [],
              )}
              extraTokens={mergePickerTokens<TopToken>(
                eligible?.tokens ?? [],
                holdings?.tokens ?? [],
              )}
              recents={destinationRecents}
              top={top}
              extraLoading={checkingEligibility}
              extraError={Boolean(eligibleError)}
              getListKey={(chainId) => destinationKey(source, chainId)}
              getSearchKey={sourceSearchKey}
              selectionStatus={
                resolvingDestination ? 'Checking routes for this destination…' : undefined
              }
              selectionError={destinationError}
              onSelect={(token) => void pickDestination(token)}
              onClose={closePicker}
            />
          )}
        </>
      }
    />
  );
}
