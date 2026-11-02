'use client';

import { useState } from 'react';
import { AutoSizer, List, ListRowProps } from 'react-virtualized';
import useSWR from 'swr';
import { twMerge } from 'tailwind-merge';

import { NATIVE_TOKEN_ADDRESS } from '@/app/src/token-registry/types';
import { formatCompactUsd } from '@/bridge/util/NumberUtils';
import { getBridgeUiConfigForChain } from '@/bridge/util/bridgeUiConfig';

// The token-list repo's registry job publishes top.json. The test folder holds the files of the
// last test run.
const TOKEN_REGISTRY_URL =
  process.env.NEXT_PUBLIC_TOKEN_REGISTRY_URL ??
  'https://tokenlist.arbitrum.io/TestFolder/TokenRegistry/v1';

const ROW_HEIGHT = 56;
const LIST_HEIGHT = 512;

const AGGRESSIVE_CACHE_OPTIONS = {
  revalidateIfStale: false,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
} as const;

type TopToken = {
  chainId: number;
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  volumeUSD24H?: number;
};

type TopFile = {
  generatedAt: string;
  tokens: TopToken[];
};

type RequestStats = {
  durationMs: number;
  // The browser only reports it when the CDN sends Timing-Allow-Origin.
  transferredBytes?: number;
  decodedBytes: number;
};

async function fetchTopTokens([url]: [string, string]): Promise<{
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

function filterTokens({
  tokens,
  chainId,
  search,
}: {
  tokens: TopToken[];
  chainId: number | null;
  search: string;
}): TopToken[] {
  const query = search.trim().toLowerCase();
  return tokens.filter(
    (token) =>
      (chainId === null || token.chainId === chainId) &&
      (!query || `${token.symbol} ${token.name} ${token.address}`.toLowerCase().includes(query)),
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

function TokenRow({
  token,
  isSelected,
  onSelect,
}: {
  token: TopToken;
  isSelected: boolean;
  onSelect: (token: TopToken) => void;
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
        <span className="block text-sm font-semibold">
          {token.symbol}{' '}
          <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-normal text-white/70">
            {getChainName(token.chainId)}
          </span>
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

export function TopTokensPoc() {
  const [chainId, setChainId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [selectedToken, setSelectedToken] = useState<TopToken | null>(null);

  const { data, error } = useSWR(
    [`${TOKEN_REGISTRY_URL}/top.json`, 'token-registry-top'] as [string, string],
    fetchTopTokens,
    AGGRESSIVE_CACHE_OPTIONS,
  );

  const tokens = data?.file.tokens ?? [];
  const tokenCountByChainId = new Map<number, number>();
  for (const token of tokens) {
    tokenCountByChainId.set(token.chainId, (tokenCountByChainId.get(token.chainId) ?? 0) + 1);
  }
  const filteredTokens = filterTokens({ tokens, chainId, search });

  const rowRenderer = ({ index, key, style }: ListRowProps) => {
    const token = filteredTokens[index];
    if (!token) {
      return null;
    }
    return (
      <div key={key} style={style}>
        <TokenRow
          token={token}
          isSelected={selectedToken !== null && getTokenKey(selectedToken) === getTokenKey(token)}
          onSelect={setSelectedToken}
        />
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold">Token Registry PoC: top tokens</h1>
      <p className="mt-2 text-sm text-white/60">
        One request for the top 1,000 tokens across all chains, from {TOKEN_REGISTRY_URL}/top.json.
      </p>

      {error && <p className="mt-6 text-red-400">Failed to load top.json: {String(error)}</p>}
      {!data && !error && <p className="mt-6 text-sm text-white/50">Loading top tokens…</p>}

      {data && (
        <>
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-white/50">Tokens</dt>
              <dd>{tokens.length}</dd>
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

          <div className="mt-6 flex flex-wrap gap-2">
            {[null, ...tokenCountByChainId.keys()].map((option) => (
              <button
                key={option ?? 'all'}
                onClick={() => setChainId(option)}
                className={twMerge(
                  'rounded-full border border-white/20 px-3 py-1 text-xs hover:bg-white/10',
                  option === chainId && 'border-white/60 bg-white/10',
                )}
              >
                {option === null ? 'All chains' : getChainName(option)}{' '}
                <span className="text-white/50">
                  {option === null ? tokens.length : tokenCountByChainId.get(option)}
                </span>
              </button>
            ))}
          </div>

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by symbol, name or address"
            className="mt-4 w-full rounded-md border border-white/20 bg-white/5 px-3 py-2 text-sm outline-none placeholder:text-white/40 focus:border-white/50"
          />

          {selectedToken && (
            <p className="mt-4 text-sm">
              Selected <span className="font-semibold">{selectedToken.symbol}</span> on{' '}
              {getChainName(selectedToken.chainId)}{' '}
              <span className="text-white/50">({selectedToken.address})</span>
            </p>
          )}

          <div className="mt-4 rounded-md border border-white/10" style={{ height: LIST_HEIGHT }}>
            {filteredTokens.length === 0 ? (
              <p className="p-3 text-sm text-white/50">No tokens match.</p>
            ) : (
              <AutoSizer>
                {({ height, width }) => (
                  <List
                    width={width}
                    height={height}
                    rowCount={filteredTokens.length}
                    rowHeight={ROW_HEIGHT}
                    rowRenderer={rowRenderer}
                  />
                )}
              </AutoSizer>
            )}
          </div>
        </>
      )}
    </div>
  );
}
