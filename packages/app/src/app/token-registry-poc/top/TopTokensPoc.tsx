'use client';

import { getArbitrumNetwork } from '@arbitrum/sdk';
import { getBalance } from '@wagmi/core';
import dynamic from 'next/dynamic';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import useSWR, { preload, useSWRConfig } from 'swr';
import { isAddress } from 'viem';
import { useAccount } from 'wagmi';

import {
  DEFAULT_SELECTION,
  DestinationSelection,
  HeldTokens,
  RegistryIndexFile,
  Selection,
  TOKEN_REGISTRY_URL,
  TOP_TOKENS_PER_CHAIN,
  TopFile,
  TopToken,
  addRecentToken,
  getDestinationProviders,
  getNetworkReach,
  isSameAsset,
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
  // A destination pick keeps the destination and lets the API change the source.
  picked?: 'destination';
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
  if (query.picked) params.set('picked', query.picked);
  return [`${API}/selection?${params}`, 'selection'];
}

// With a network filter, top.json holds every token of a chain with fewer than 1,000, so the
// picker searches it without the server. A pasted address still asks the server, which imports it.
function searchKey(top: TopFile | undefined, chainId: number | null, query: string): SwrKey | null {
  if (query.trim().length < 2) return null;
  const isComplete =
    chainId !== null &&
    top !== undefined &&
    top.tokens.filter((token) => token.chainId === chainId).length < TOP_TOKENS_PER_CHAIN;
  if (isComplete && !isAddress(query.trim())) return null;
  const params = new URLSearchParams({ q: query });
  if (chainId !== null) params.set('chainId', String(chainId));
  return [`${API}/search?${params}`, 'source-search'];
}

// The network rail without index.json: top.json holds every chain's native token, and the bridge's
// chain config gives the name and the parent chain.
function getPickerChains(chainIds: number[]): RegistryIndexFile['chains'] {
  return [...new Set(chainIds)].map((chainId) => {
    let parentChainId: number | undefined;
    try {
      parentChainId = getArbitrumNetwork(chainId).parentChainId;
    } catch {
      parentChainId = undefined;
    }
    return {
      chainId,
      name: getBridgeUiConfigForChain(chainId).network.name,
      ...(parentChainId ? { parentChainId } : {}),
    };
  });
}

// The last picks of each side stay across visits. Storage can be unavailable, for example in a
// private window, and the picker then keeps them for the page session only.
function loadRecents(side: 'source' | 'destination'): TopToken[] {
  try {
    const stored = window.localStorage.getItem(`token-registry-poc:recents:${side}`);
    return stored ? (JSON.parse(stored) as TopToken[]) : [];
  } catch {
    return [];
  }
}

function saveRecents(side: 'source' | 'destination', recents: TopToken[]) {
  try {
    window.localStorage.setItem(`token-registry-poc:recents:${side}`, JSON.stringify(recents));
  } catch {
    // The recents stay in memory.
  }
}

// The selected tokens and the native tokens of their chains. The balances give the held tokens'
// prices.
function pricesKey(tokens: (TopToken | undefined)[]): SwrKey | null {
  const keys = [
    ...new Set(
      tokens.flatMap((token) =>
        token
          ? [tokenKey(token), tokenKey({ chainId: token.chainId, address: NATIVE_TOKEN_ADDRESS })]
          : [],
      ),
    ),
  ].sort();
  return keys.length
    ? [`${API}/prices?${new URLSearchParams({ tokens: keys.join(',') })}`, 'prices']
    : null;
}

const BALANCES_MAX_AGE = 5 * 60_000;

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
  const [needsBalances, setNeedsBalances] = useState(false);
  const balancesReadAt = useRef(0);
  const [sourceRecents, setSourceRecents] = useState(() => loadRecents('source'));
  const [destinationRecents, setDestinationRecents] = useState(() => loadRecents('destination'));
  useEffect(() => saveRecents('source', sourceRecents), [sourceRecents]);
  useEffect(() => saveRecents('destination', destinationRecents), [destinationRecents]);
  const [pendingSource, setPendingSource] = useState<TopToken>();
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
  const { data: holdings, mutate: refreshBalances } = useSWR(
    // The read starts when the user hovers or focuses a token button, or opens a picker. A user
    // who never reaches for a picker never triggers it.
    address && needsBalances
      ? ([`${API}/balances?${new URLSearchParams({ address })}`, 'balances'] as const)
      : null,
    fetchJson<HeldTokens>,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      onSuccess: () => {
        balancesReadAt.current = Date.now();
      },
    },
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
  const { data: selectedPrices } = useSWR(
    pricesKey([source, destination]),
    fetchJson<Record<string, number>>,
    { refreshInterval: 60_000 },
  );
  const prices: Record<string, number> = { ...selectedPrices };
  for (const token of holdings?.tokens ?? []) {
    if (token.priceUSD !== undefined) prices[tokenKey(token)] ??= token.priceUSD;
  }
  const chains = getPickerChains(
    top
      ? top.tokens.flatMap((token) =>
          token.address === NATIVE_TOKEN_ADDRESS ? [token.chainId] : [],
        )
      : [
          ...(source ? [source.chainId] : []),
          ...(selection?.destinationChains.map((chain) => chain.chainId) ?? []),
        ],
  );
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

  // Each picker open reads the balances again when the last read is more than 5 minutes old.
  function readBalances() {
    setNeedsBalances(true);
    if (holdings && Date.now() - balancesReadAt.current > BALANCES_MAX_AGE) void refreshBalances();
  }

  function openSource() {
    resolutionAttempt.current += 1;
    setNeedsTop(true);
    readBalances();
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

  // The selection's routes tell whether the source reaches the token. Only a token it does not
  // reach, or a swap of the sides, needs the API to pick the source.
  async function resolveDestination(
    token: TopToken,
  ): Promise<{ result: DestinationSelection; selection?: Selection }> {
    if (!source || !selection) throw new Error('No source token.');
    const swap = destination && tokenKey(source) === tokenKey(token);
    const providers = swap
      ? undefined
      : getDestinationProviders(selection.destinationChains, token);
    if (providers) {
      return {
        result: {
          kind: 'resolved',
          sourceToken: source,
          destinationToken: { ...token, providers },
          sourceChanged: false,
        },
      };
    }
    setResolvingDestination(true);
    const requestedSource = swap ? destination : source;
    const result = await fetchJson<Selection>(
      selectionKey({
        sourceChainId: requestedSource.chainId,
        sourceToken: requestedSource.address,
        destinationChainId: token.chainId,
        destinationToken: token.address,
        picked: 'destination',
      }),
    );
    if (result.adjustment?.kind === 'unavailable') {
      return { result: { kind: 'unavailable', reason: result.adjustment.message } };
    }
    if (!result.sourceToken || !result.destinationToken) {
      throw new Error('Could not check routes. Select the token again to retry.');
    }
    // The response is the selection of the new URL, so the page does not ask for it again.
    const { adjustment: _adjustment, ...nextSelection } = result;
    return {
      result: {
        kind: 'resolved',
        sourceToken: result.sourceToken,
        destinationToken: result.destinationToken,
        sourceChanged: tokenKey(result.sourceToken) !== tokenKey(requestedSource),
      },
      selection: nextSelection,
    };
  }

  async function pickDestination(token: TopToken) {
    if (!source) return;
    const attempt = ++resolutionAttempt.current;
    setDestinationError('');
    try {
      const { result, selection: resolvedSelection } = await resolveDestination(token);
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
      const nextSelection = resolvedSelection ?? (await fetchJson<Selection>(nextKey));
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

  const pickerError = topError;
  // The destination picker opens with the selection's same-asset tokens, and adds the top.json
  // tokens when the file loads.
  const metadataReady = Boolean(top || openPicker === 'destination');
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
        setNeedsTop(true);
        readBalances();
        setDestinationError('');
        transitionPicker(() => setOpenPicker('destination'));
      }}
      onIntent={() => {
        void preload(TOP_FILE_KEY, fetchJson<TopFile>);
        setNeedsBalances(true);
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
      picker={
        <>
          {' '}
          {openPicker && !metadataReady && (
            <div role="status" className="mt-4 rounded border border-white/20 p-4 text-sm">
              {pickerError ? (
                <>
                  Could not load picker data.{' '}
                  <button type="button" className="text-sky-300" onClick={() => void retryTop()}>
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
              getSearchKey={(chainId, query) => searchKey(top, chainId, query)}
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
                (pendingSource ? [] : selection.destinationChains).flatMap((chain) => chain.tokens),
                top?.tokens ?? [],
              )}
              extraTokens={holdings?.tokens ?? []}
              recents={destinationRecents}
              top={top}
              getProviders={
                pendingSource
                  ? undefined
                  : (token) => getDestinationProviders(selection.destinationChains, token)
              }
              sameAssetTokens={
                pendingSource
                  ? []
                  : selection.destinationChains.flatMap((chain) => chain.tokens.filter(isSameAsset))
              }
              getNetworkReach={
                pendingSource
                  ? undefined
                  : (chainId) => getNetworkReach(selection.destinationChains, chainId)
              }
              getSearchKey={(chainId, query) => searchKey(top, chainId, query)}
              description={top ? undefined : 'Loading more tokens…'}
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
