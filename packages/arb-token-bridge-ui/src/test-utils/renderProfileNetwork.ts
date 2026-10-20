// Answers every request of the render profile with generated data, see renderProfileFixtures.ts.
// With the same responses in the same order, the profile renders the same way on every run.
import { HttpResponse, type PathParams, http } from 'msw';
import { setupServer } from 'msw/node';

import orbitChainsData from '../util/orbitChainsData.json';
import {
  generateArbitrumStatus,
  generateArbitrumTokenList,
  generateLayerZeroMetadata,
  generateLifiRoutes,
  generateLifiTokenList,
} from './renderProfileFixtures';

// The RPC URLs of the core chains are set to this origin in vitest.profile.config.ts
export const profileRpcOrigin = 'https://rpc.profile.test';

type JsonRpcRequest = { jsonrpc: '2.0'; id: number; method: string; params?: unknown[] };

let pendingRequests = 0;
let networkActivity = 0;
let requestCount = 0;
const unhandledRequests = new Set<string>();

function getChainId(url: URL) {
  if (url.origin === profileRpcOrigin) {
    return Number(url.pathname.slice(1));
  }
  const orbitChain = [...orbitChainsData.mainnet, ...orbitChainsData.testnet].find(
    ({ rpcUrl }) => new URL(rpcUrl).href === url.href,
  );
  return orbitChain?.chainId;
}

const toHex = (value: number) => `0x${value.toString(16)}`;

function getBlock(chainId: number) {
  // L1 blocks every 12 seconds, L2 blocks every 250 ms, following the fake clock
  const blockTime = chainId === 1 ? 12_000 : 250;
  const number = Math.floor(Date.now() / blockTime);
  return {
    number: toHex(number),
    hash: `0x${number.toString(16).padStart(64, '0')}`,
    parentHash: `0x${(number - 1).toString(16).padStart(64, '0')}`,
    timestamp: toHex(Math.floor(Date.now() / 1_000)),
    nonce: '0x0000000000000000',
    difficulty: '0x0',
    gasLimit: toHex(30_000_000),
    gasUsed: toHex(15_000_000),
    miner: '0x0000000000000000000000000000000000000000',
    extraData: '0x',
    baseFeePerGas: chainId === 1 ? toHex(1_000_000_000) : toHex(10_000_000),
    transactions: [],
  };
}

function answerJsonRpc(chainId: number, { id, method }: JsonRpcRequest) {
  const results: { [method: string]: () => unknown } = {
    eth_chainId: () => toHex(chainId),
    net_version: () => String(chainId),
    eth_blockNumber: () => getBlock(chainId).number,
    eth_getBlockByNumber: () => getBlock(chainId),
    eth_gasPrice: () => getBlock(chainId).baseFeePerGas,
    eth_maxPriorityFeePerGas: () => toHex(1_000_000),
    eth_estimateGas: () => toHex(200_000),
    eth_getBalance: () => '0x0',
    eth_getTransactionCount: () => '0x0',
    eth_getCode: () => '0x',
    // Contract calls aren't decoded, an empty result reads like a missing contract
    eth_call: () => '0x',
  };
  const result = results[method];
  if (!result) {
    unhandledRequests.add(`RPC ${method}`);
    return { jsonrpc: '2.0', id, error: { code: -32601, message: `${method} is not generated` } };
  }
  return { jsonrpc: '2.0', id, result: result() };
}

// Counts the requests in flight, so the fake clock only moves once they're answered
function track(
  resolver: (info: { request: Request; params: PathParams }) => Response | Promise<Response>,
) {
  return async (info: { request: Request; params: PathParams }) => {
    pendingRequests += 1;
    networkActivity += 1;
    requestCount += 1;
    try {
      return await resolver(info);
    } finally {
      pendingRequests -= 1;
      networkActivity += 1;
    }
  };
}

const server = setupServer(
  http.get(
    'https://tokenlist.arbitrum.io/ArbTokenLists/:file',
    track(({ params }) => HttpResponse.json(generateArbitrumTokenList(String(params.file)))),
  ),
  http.get(
    '*/api/crosschain-transfers/lifi/tokens',
    track(({ request }) => {
      const { searchParams } = new URL(request.url);
      return HttpResponse.json(
        generateLifiTokenList(
          Number(searchParams.get('parentChainId')),
          Number(searchParams.get('childChainId')),
        ),
      );
    }),
  ),
  http.get(
    '*/api/crosschain-transfers/lifi',
    track(({ request }) =>
      HttpResponse.json(generateLifiRoutes(new URL(request.url).searchParams)),
    ),
  ),
  http.get(
    '*/api/status',
    track(() => HttpResponse.json(generateArbitrumStatus())),
  ),
  http.get(
    '*/api/layerzero-metadata',
    track(() => HttpResponse.json(generateLayerZeroMetadata())),
  ),
  http.post(
    '*',
    track(async ({ request }) => {
      const url = new URL(request.url);
      const chainId = getChainId(url);
      if (chainId === undefined) {
        unhandledRequests.add(`POST ${url.origin}${url.pathname}`);
        return HttpResponse.error();
      }
      const body = (await request.json()) as JsonRpcRequest | JsonRpcRequest[];
      return HttpResponse.json(
        Array.isArray(body)
          ? body.map((rpcRequest) => answerJsonRpc(chainId, rpcRequest))
          : answerJsonRpc(chainId, body),
      );
    }),
  ),
  // Anything else fails like a network error, so a new API can't make the profile flaky
  http.all(
    '*',
    track(({ request }) => {
      const url = new URL(request.url);
      unhandledRequests.add(`${request.method} ${url.origin}${url.pathname}`);
      return HttpResponse.error();
    }),
  ),
);

export function startProfileNetwork() {
  server.listen();
}

// Resolves once no request is in flight and a few event loop turns passed without any, so the
// responses were parsed and the updates they trigger were scheduled
export async function waitForNetworkIdle() {
  for (let idleTurns = 0; idleTurns < 5; ) {
    const activityBefore = networkActivity;
    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => setImmediate(resolve));
    idleTurns = pendingRequests === 0 && networkActivity === activityBefore ? idleTurns + 1 : 0;
  }
}

export function getRequestCount() {
  return requestCount;
}

export function getUnhandledRequests() {
  return [...unhandledRequests].sort();
}
