// Measures what `useTokensFromLists` costs on each render, for token lists of growing size, and the
// SWR key text it builds. Runs with the render profile, `pnpm test:profile`, which writes the
// results to RENDER_PROFILE_DIRECTORY/costs.json for the report to compare with master.
import { mkdirSync, writeFileSync } from 'fs';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/profiling';
import { SWRConfig } from 'swr';
import useSWRImmutable from 'swr/immutable';
import { expect, test, vi } from 'vitest';

import { generateArbitrumTokenList } from '../../test-utils/renderProfileFixtures';
import { forgetSwrCache, recordSwrKeys, swrKeyProfiler } from '../../test-utils/renderProfileSwr';
import { ChainId } from '../../types/ChainId';
import type { TokenListWithId } from '../../util/TokenListUtils';
import { useTokensFromLists } from './TokenSearchUtils';

const tokenLists = vi.hoisted(() => ({ current: [] as unknown[] }));

vi.mock('../../hooks/useNetworks', () => ({ useNetworks: () => [{}] }));
vi.mock('../../hooks/useNetworksRelationship', () => ({
  useNetworksRelationship: () => ({
    parentChain: { id: 1 },
    childChain: { id: 42161 },
  }),
}));
// The same array on every render, like the data SWR returns for the fetched lists
vi.mock('../../hooks/useTokenLists', () => ({
  useTokenLists: () => ({ data: tokenLists.current, isLoading: false, isValidating: false }),
}));

// The token lists the bridge fetches for Arbitrum One, with the sizes of the real ones
const listFiles = [
  'arbed_arb_whitelist_era.json',
  'arbed_uniswap_labs_default.json',
  'arbed_coingecko.json',
  'arbed_coinmarketcap.json',
  'arbitrum_token_token_list.json',
];
// Today's lists, and 4 times as many tokens
const scales = [1, 4];
const measuredRenders = 50;

// The address of a token in its copy `copy`, the same in every list so the lists still overlap
const copyAddress = (address: string, copy: number) =>
  copy === 0 ? address : `0x${copy.toString(16).padStart(2, '0')}${address.slice(4).toLowerCase()}`;

// Repeats every token `scale` times as new tokens. The bridge keys a child chain token by its parent
// chain address, so the copies get new parent chain addresses too.
function createTokenLists(scale: number): TokenListWithId[] {
  return listFiles.map((file) => {
    const list = generateArbitrumTokenList(file);
    return {
      ...list,
      tokens: Array.from({ length: scale }, (_, copy) =>
        list.tokens.map((token) => {
          const bridgeInfo = token.extensions?.bridgeInfo as
            | Record<string, { tokenAddress: string }>
            | undefined;
          return {
            ...token,
            address: copyAddress(token.address, copy),
            ...(bridgeInfo && {
              extensions: {
                ...token.extensions,
                bridgeInfo: Object.fromEntries(
                  Object.entries(bridgeInfo).map(([chainId, info]) => [
                    chainId,
                    { ...info, tokenAddress: copyAddress(info.tokenAddress, copy) },
                  ]),
                ),
              },
            }),
          };
        }),
      ).flat(),
      l2ChainId: String(ChainId.ArbitrumOne),
      bridgeTokenListId: file,
    };
  });
}

// The render profile runs with --expose-gc
const heapUsed = () => {
  globalThis.gc?.();
  return process.memoryUsage().heapUsed;
};

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

// The same SWR call with a key of three values, to tell the cost of the key from the cost of a
// render
function useSmallKey() {
  return useSWRImmutable([1, 42161, 'useSmallKey'], () => ({}));
}

// Renders a component that calls the hook. React's production build has no act(), so renders are
// synchronous with flushSync, like the render profile does without act().
async function measure<Result>(useHook: () => Result, isReady: (result: Result) => boolean) {
  const cache = new Map();
  let latest: Result | undefined;
  const onResult = (result: Result) => {
    latest = result;
  };
  function Probe({ onRender }: { onRender: (result: Result) => void }) {
    onRender(useHook());
    return null;
  }
  const heapBefore = heapUsed();
  const root = createRoot(document.createElement('div'));
  const rerender = () =>
    flushSync(() =>
      root.render(
        <SWRConfig value={{ provider: () => cache, use: [swrKeyProfiler] }}>
          <Probe onRender={onResult} />
        </SWRConfig>,
      ),
    );
  rerender();
  // The data is converted once, outside the measured renders. Timers follow the render profile's
  // fake clock, so this waits on the event loop instead.
  for (let attempt = 0; attempt < 100 && !(latest && isReady(latest)); attempt += 1) {
    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => setImmediate(resolve));
  }
  expect(latest && isReady(latest)).toBe(true);
  for (let index = 0; index < 5; index += 1) {
    rerender();
  }
  const durations: number[] = [];
  const keys = await recordSwrKeys(async () => {
    for (let index = 0; index < measuredRenders; index += 1) {
      const start = performance.now();
      rerender();
      durations.push(performance.now() - start);
    }
  });
  const retainedBytes = heapUsed() - heapBefore;
  root.unmount();
  // Releases the cache and the last result, and lets React finish the unmount, so the next
  // measurement doesn't start with this one's data
  forgetSwrCache(cache);
  latest = undefined;
  for (let turn = 0; turn < 5; turn += 1) {
    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => setImmediate(resolve));
  }
  return {
    renderMs: median(durations),
    keyLength:
      Object.values(keys.serializedByKey).reduce((total, length) => total + length, 0) /
      measuredRenders,
    cacheKeyLength: [...cache.keys()].reduce((total, key) => total + String(key).length, 0),
    retainedBytes,
  };
}

const formatSize = (bytes: number) =>
  bytes >= 1e6 ? `${(bytes / 1e6).toFixed(2)} MB` : `${(bytes / 1e3).toFixed(1)} KB`;

test('cost of a render of useTokensFromLists for growing token lists', async () => {
  // A reference for the table, the report leaves it out
  const costs: ({ name: string; reference?: boolean } & Awaited<ReturnType<typeof measure>>)[] = [
    {
      name: 'useSmallKey',
      reference: true,
      ...(await measure(useSmallKey, ({ data }) => !!data)),
    },
  ];
  // Measurements that aren't reported. The first ones also pay one-time costs, like the code the
  // engine optimizes, and made the first reported heap off by up to 300 KB.
  for (const scale of scales) {
    tokenLists.current = createTokenLists(scale);
    // eslint-disable-next-line no-await-in-loop
    await measure(
      () => useTokensFromLists(),
      ({ data }) => Object.keys(data).length > 0,
    );
  }
  for (const scale of scales) {
    // A first conversion of the same lists fills viem's cache of checked addresses, shared by the
    // whole app, so the measurement only keeps what the hook keeps. Without it, the result depended
    // on which size ran before.
    tokenLists.current = createTokenLists(scale);
    // eslint-disable-next-line no-await-in-loop
    await measure(
      () => useTokensFromLists(),
      ({ data }) => Object.keys(data).length > 0,
    );
    tokenLists.current = createTokenLists(scale);
    const tokens = (tokenLists.current as TokenListWithId[]).reduce(
      (total, list) => total + list.tokens.length,
      0,
    );
    // One size after the other, so the measurements never overlap
    // eslint-disable-next-line no-await-in-loop
    const cost = await measure(
      () => useTokensFromLists(),
      ({ data }) => Object.keys(data).length > 0,
    );
    costs.push({ name: `useTokensFromLists, ${tokens.toLocaleString('en-US')} tokens`, ...cost });
  }

  const outputDirectory = process.env.RENDER_PROFILE_DIRECTORY ?? 'render-profile';
  mkdirSync(outputDirectory, { recursive: true });
  writeFileSync(`${outputDirectory}/costs.json`, JSON.stringify(costs, null, 2));
  // happy-dom replaces console, so the table goes to the terminal directly
  process.stdout.write(
    [
      `Median of ${measuredRenders} renders of a component calling the hook once`,
      '',
      '| Hook | Time per render | Key text built per render | SWR cache keys | Heap retained |',
      '|:---|---:|---:|---:|---:|',
      ...costs.map(
        (cost) =>
          `| ${cost.name} | ${cost.renderMs.toFixed(3)} ms | ${formatSize(cost.keyLength)} | ${formatSize(cost.cacheKeyLength)} | ${formatSize(cost.retainedBytes)} |`,
      ),
      '',
    ].join('\n'),
  );
}, 120_000);
