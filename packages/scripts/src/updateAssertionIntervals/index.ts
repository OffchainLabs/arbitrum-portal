import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';

import { getParentChainInfo } from '../addOrbitChain/schemas';

type OrbitChainConfig = {
  chainId: number;
  name: string;
  parentChainId: number;
  isTestnet: boolean;
  ethBridge: {
    rollup: string;
  };
  bridgeUiConfig: {
    assertionIntervalSeconds?: number;
    [key: string]: unknown;
  };
};

type OrbitChainsData = {
  mainnet: OrbitChainConfig[];
  testnet: OrbitChainConfig[];
};

type AssertionIntervalResult =
  | {
      status: 'ok';
      interval: number;
    }
  | {
      status: 'insufficient_data';
    };

const SECONDS_IN_15_MIN = 900;
/** Chains at this interval (1h) are treated as default and omitted from the JSON. */
const DEFAULT_ASSERTION_INTERVAL_SECONDS = 3600;
const SAMPLE_SIZE = 20;
const LOOKBACK_MULTIPLIERS = [1, 4, 13]; // 7d, 30d, 91d

// Legacy rollup event (pre-BoLD)
const LEGACY_ROLLUP_ABI = [
  'event NodeCreated(uint64 indexed nodeNum, bytes32 indexed parentNodeHash, bytes32 indexed nodeHash, bytes32 executionHash, tuple(tuple(tuple(bytes32[2] bytes32Vals, uint64[2] u64Vals) globalState, uint8 machineStatus) beforeState, tuple(tuple(bytes32[2] bytes32Vals, uint64[2] u64Vals) globalState, uint8 machineStatus) afterState, uint64 numBlocks) assertion, bytes32 afterInboxBatchAcc, bytes32 wasmModuleRoot, uint256 inboxMaxCount)',
];

// BoLD rollup event
const BOLD_ROLLUP_ABI = [
  'event AssertionCreated(bytes32 indexed assertionHash, bytes32 indexed parentAssertionHash, tuple(tuple(bytes32 prevPrevAssertionHash, bytes32 sequencerBatchAcc, tuple(bytes32 wasmModuleRoot, uint256 requiredStake, address challengeManager, uint64 confirmPeriodBlocks, uint64 nextInboxPosition) configData) beforeStateData, tuple(tuple(bytes32[2] bytes32Vals, uint64[2] u64Vals) globalState, uint8 machineStatus, bytes32 endHistoryRoot) beforeState, tuple(tuple(bytes32[2] bytes32Vals, uint64[2] u64Vals) globalState, uint8 machineStatus, bytes32 endHistoryRoot) afterState) assertion, bytes32 afterInboxBatchAcc, uint256 inboxMaxCount, bytes32 wasmModuleRoot, uint256 requiredStake, address challengeManager, uint64 confirmPeriodBlocks)',
];

function getParentProvider(parentChainId: number): ethers.providers.JsonRpcProvider {
  const { rpcUrl } = getParentChainInfo(parentChainId);
  return new ethers.providers.JsonRpcProvider(rpcUrl);
}

/**
 * Rounds to the nearest 15-minute increment with a minimum floor of 15 minutes.
 * Passing 0 returns 900 (15 min), not 0.
 */
function roundToNearest15Min(seconds: number): number {
  return Math.max(SECONDS_IN_15_MIN, Math.round(seconds / SECONDS_IN_15_MIN) * SECONDS_IN_15_MIN);
}

function median(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
}

function getLookbackBlocks(parentChainId: number): number {
  const blocksPerDay = parentChainId === 1 ? 7200 : parentChainId === 8453 ? 43200 : 345600;

  return blocksPerDay * 7;
}

/**
 * Queries both legacy (NodeCreated) and BoLD (AssertionCreated) events from the
 * rollup contract. Chains that upgraded from legacy to BoLD will have both event
 * types — we merge and sort by block number to use the most recent assertions.
 */
async function queryAssertionEvents(
  rollupAddress: string,
  provider: ethers.providers.JsonRpcProvider,
  fromBlock: number,
  toBlock: number,
): Promise<ethers.Event[]> {
  const legacyContract = new ethers.Contract(rollupAddress, LEGACY_ROLLUP_ABI, provider);
  const boldContract = new ethers.Contract(rollupAddress, BOLD_ROLLUP_ABI, provider);

  const legacyFilter = legacyContract.filters.NodeCreated?.();
  const boldFilter = boldContract.filters.AssertionCreated?.();

  const [legacyEvents, boldEvents] = await Promise.all([
    legacyFilter
      ? legacyContract.queryFilter(legacyFilter, fromBlock, toBlock).catch(() => [])
      : Promise.resolve([]),
    boldFilter
      ? boldContract.queryFilter(boldFilter, fromBlock, toBlock).catch(() => [])
      : Promise.resolve([]),
  ]);

  // Merge and sort by block number, then log index
  return [...legacyEvents, ...boldEvents].sort(
    (a, b) => a.blockNumber - b.blockNumber || a.logIndex - b.logIndex,
  );
}

async function getAssertionInterval(
  chain: OrbitChainConfig,
  provider: ethers.providers.JsonRpcProvider,
): Promise<AssertionIntervalResult> {
  const latestBlock = await provider.getBlockNumber();
  const baseLookback = getLookbackBlocks(chain.parentChainId);

  let events: ethers.Event[] = [];
  let lookbackLabel = '';

  for (const multiplier of LOOKBACK_MULTIPLIERS) {
    const fromBlock = Math.max(0, latestBlock - baseLookback * multiplier);
    // eslint-disable-next-line no-await-in-loop
    events = await queryAssertionEvents(chain.ethBridge.rollup, provider, fromBlock, latestBlock);
    lookbackLabel = `${multiplier * 7}d`;
    if (events.length >= 2) {
      break;
    }
  }

  if (events.length < 2) {
    console.warn(`  ${chain.name} (${chain.chainId}): <2 events in 91d, preserving current value`);
    return { status: 'insufficient_data' };
  }

  const recentEvents = events.slice(-SAMPLE_SIZE);
  const intervals: number[] = [];

  for (let i = 1; i < recentEvents.length; i++) {
    // eslint-disable-next-line no-await-in-loop
    const [previousBlock, currentBlock] = await Promise.all([
      provider.getBlock(recentEvents[i - 1]!.blockNumber),
      provider.getBlock(recentEvents[i]!.blockNumber),
    ]);

    if (!previousBlock || !currentBlock) {
      throw new Error(
        `Missing block data while computing assertion interval for ${chain.name} (${chain.chainId})`,
      );
    }

    intervals.push(currentBlock.timestamp - previousBlock.timestamp);
  }

  if (intervals.length === 0) {
    throw new Error(`No intervals computed for ${chain.name} (${chain.chainId})`);
  }

  const medianInterval = median(intervals);
  const roundedInterval = roundToNearest15Min(medianInterval);

  console.log(
    `  ${chain.name} (${chain.chainId}): median=${(medianInterval / 3600).toFixed(1)}h -> rounded=${(roundedInterval / 3600).toFixed(1)}h (${roundedInterval}s) [${lookbackLabel}]`,
  );

  return { status: 'ok', interval: roundedInterval };
}

export async function updateAssertionIntervals(targetJsonPath: string): Promise<void> {
  const jsonPath = path.resolve(targetJsonPath);
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
      try {
        // eslint-disable-next-line no-await-in-loop
        const result = await getAssertionInterval(chain, provider);
        if (result.status === 'ok') {
          intervalsByChainId.set(chain.chainId, result.interval);
        }
      } catch (error) {
        throw new Error(
          `Failed to update assertion interval for ${chain.name} (${chain.chainId}): ${
            (error as Error).message
          }`,
        );
      }
    }
  }

  let updatedChains = 0;

  for (const section of ['mainnet', 'testnet'] as const) {
    for (const chain of data[section]) {
      if (!intervalsByChainId.has(chain.chainId)) {
        continue;
      }

      const interval = intervalsByChainId.get(chain.chainId);

      if (interval && interval !== DEFAULT_ASSERTION_INTERVAL_SECONDS) {
        chain.bridgeUiConfig.assertionIntervalSeconds = interval;
        updatedChains++;
      } else {
        delete chain.bridgeUiConfig.assertionIntervalSeconds;
      }
    }
  }

  fs.writeFileSync(jsonPath, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`\nUpdated ${updatedChains} chains in ${jsonPath}`);
}
