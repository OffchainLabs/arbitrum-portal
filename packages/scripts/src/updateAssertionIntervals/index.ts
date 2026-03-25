import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';

type OrbitChainConfig = {
  chainId: number;
  name: string;
  parentChainId: number;
  isTestnet: boolean;
  ethBridge: {
    rollup: string;
  };
  assertionIntervalSeconds?: number;
};

type OrbitChainsData = {
  mainnet: OrbitChainConfig[];
  testnet: OrbitChainConfig[];
};

const SECONDS_IN_30_MIN = 1800;
const DEFAULT_ASSERTION_INTERVAL_SECONDS = 3600;
const SAMPLE_SIZE = 20;

const ROLLUP_ABI = [
  'event NodeCreated(uint64 indexed nodeNum, bytes32 indexed parentNodeHash, bytes32 indexed nodeHash, bytes32 executionHash, tuple(tuple(tuple(bytes32[2] bytes32Vals, uint64[2] u64Vals) globalState, uint8 machineStatus) beforeState, tuple(tuple(bytes32[2] bytes32Vals, uint64[2] u64Vals) globalState, uint8 machineStatus) afterState, uint64 numBlocks) assertion, bytes32 afterInboxBatchAcc, bytes32 wasmModuleRoot, uint256 inboxMaxCount)',
];

const DEFAULT_PARENT_RPCS: Record<number, string> = {
  1: 'https://eth.llamarpc.com',
  42161: 'https://arb1.arbitrum.io/rpc',
  8453: 'https://mainnet.base.org',
};

function resolveOrbitChainsDataPath(targetJsonPath?: string): string {
  if (targetJsonPath) {
    return path.resolve(targetJsonPath);
  }

  const candidates = [
    path.resolve(process.cwd(), 'packages/arb-token-bridge-ui/src/util/orbitChainsData.json'),
    path.resolve(__dirname, '../../../../arb-token-bridge-ui/src/util/orbitChainsData.json'),
    path.resolve(__dirname, '../../../arb-token-bridge-ui/src/util/orbitChainsData.json'),
  ];

  const resolvedPath = candidates.find((candidate) => fs.existsSync(candidate));

  if (!resolvedPath) {
    throw new Error(
      'Could not locate orbitChainsData.json. Pass the path explicitly with update-assertion-intervals <targetJsonPath>.',
    );
  }

  return resolvedPath;
}

function getParentProvider(parentChainId: number): ethers.providers.JsonRpcProvider {
  const envKey = `PARENT_RPC_${parentChainId}`;
  const rpcUrl = process.env[envKey] ?? DEFAULT_PARENT_RPCS[parentChainId];

  if (!rpcUrl) {
    throw new Error(`No RPC URL for parent chain ${parentChainId}. Set ${envKey}.`);
  }

  return new ethers.providers.JsonRpcProvider(rpcUrl);
}

function roundToNearest30Min(seconds: number): number {
  return Math.max(SECONDS_IN_30_MIN, Math.round(seconds / SECONDS_IN_30_MIN) * SECONDS_IN_30_MIN);
}

function median(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 0
    ? (sorted[mid - 1]! + sorted[mid]!) / 2
    : sorted[mid]!;
}

function getLookbackBlocks(parentChainId: number): number {
  const blocksPerDay =
    parentChainId === 1 ? 7200 : parentChainId === 8453 ? 43200 : 345600;

  return blocksPerDay * 7;
}

async function getAssertionInterval(
  chain: OrbitChainConfig,
  provider: ethers.providers.JsonRpcProvider,
): Promise<number | null> {
  const contract = new ethers.Contract(chain.ethBridge.rollup, ROLLUP_ABI, provider);

  try {
    const latestBlock = await provider.getBlockNumber();
    const fromBlock = Math.max(0, latestBlock - getLookbackBlocks(chain.parentChainId));
    const nodeCreatedFilter = contract.filters.NodeCreated?.();

    if (!nodeCreatedFilter) {
      throw new Error(`NodeCreated filter unavailable for rollup ${chain.ethBridge.rollup}`);
    }

    const events = await contract.queryFilter(nodeCreatedFilter, fromBlock, latestBlock);

    if (events.length < 2) {
      console.log(`  ${chain.name} (${chain.chainId}): <2 events, skipping`);
      return null;
    }

    const recentEvents = events.slice(-SAMPLE_SIZE);
    const intervals: number[] = [];

    for (let i = 1; i < recentEvents.length; i++) {
      const [previousBlock, currentBlock] = await Promise.all([
        provider.getBlock(recentEvents[i - 1]!.blockNumber),
        provider.getBlock(recentEvents[i]!.blockNumber),
      ]);

      intervals.push(currentBlock.timestamp - previousBlock.timestamp);
    }

    if (intervals.length === 0) {
      return null;
    }

    const medianInterval = median(intervals);
    const roundedInterval = roundToNearest30Min(medianInterval);

    console.log(
      `  ${chain.name} (${chain.chainId}): median=${(medianInterval / 3600).toFixed(1)}h -> rounded=${(roundedInterval / 3600).toFixed(1)}h (${roundedInterval}s)`,
    );

    return roundedInterval;
  } catch (error) {
    console.error(`  ${chain.name} (${chain.chainId}): error - ${(error as Error).message}`);
    return null;
  }
}

export async function updateAssertionIntervals(targetJsonPath?: string): Promise<void> {
  const jsonPath = resolveOrbitChainsDataPath(targetJsonPath);
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8')) as OrbitChainsData;
  const mainnetChains = data.mainnet.filter((chain) => !chain.isTestnet);

  const chainsByParent = new Map<number, OrbitChainConfig[]>();
  for (const chain of mainnetChains) {
    const chains = chainsByParent.get(chain.parentChainId) ?? [];
    chains.push(chain);
    chainsByParent.set(chain.parentChainId, chains);
  }

  const intervalsByChainId = new Map<number, number>();

  for (const [parentChainId, chains] of chainsByParent) {
    console.log(`\nParent chain ${parentChainId}:`);
    const provider = getParentProvider(parentChainId);

    for (const chain of chains) {
      const interval = await getAssertionInterval(chain, provider);
      if (interval !== null) {
        intervalsByChainId.set(chain.chainId, interval);
      }
    }
  }

  let updatedChains = 0;

  for (const section of ['mainnet', 'testnet'] as const) {
    for (const chain of data[section]) {
      const interval = intervalsByChainId.get(chain.chainId);

      if (interval && interval !== DEFAULT_ASSERTION_INTERVAL_SECONDS) {
        chain.assertionIntervalSeconds = interval;
        updatedChains++;
        continue;
      }

      delete chain.assertionIntervalSeconds;
    }
  }

  fs.writeFileSync(jsonPath, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`\nUpdated ${updatedChains} chains in ${jsonPath}`);
}
