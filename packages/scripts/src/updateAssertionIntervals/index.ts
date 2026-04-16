import dotenv from 'dotenv';
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';

import { getParentChainInfo } from '../addOrbitChain/schemas';

// Load env vars from packages/app/.env (where RPC keys live).
// Try both repo root (direct invocation) and packages/scripts (yarn workspace).
dotenv.config({ path: path.resolve(process.cwd(), 'packages/app/.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../app/.env') });

type OrbitChainConfig = {
  chainId: number;
  name: string;
  parentChainId: number;
  isTestnet: boolean;
  ethBridge: {
    rollup: string;
    sequencerInbox: string;
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

export type DelayEstimate = {
  assertionIntervalSeconds: number;
};

type DelayEstimateResult =
  | {
      status: 'ok';
      estimate: DelayEstimate;
      sampleCount: number;
    }
  | {
      status: 'insufficient_data';
    };

export type AssertionEventRecord = {
  afterInboxBatchAcc: string;
  blockNumber: number;
  logIndex: number;
  timestamp: number;
};

export type SequencerBatchRecord = {
  afterAcc: string;
  blockNumber: number;
  logIndex: number;
  timestamp: number;
  isMessageBearing: boolean;
};

export type DelaySample = {
  batchPostingDelaySeconds: number;
  assertionAfterBatchDelaySeconds: number;
};

const SAMPLE_SIZE = 20;
const MIN_COMPLETE_CYCLE_COUNT = 2;
const TARGET_ASSERTION_COUNT = SAMPLE_SIZE * 4;
const MAX_LOOKBACK_MULTIPLIER = 13; // 91d
const RPC_CONCURRENCY_LIMIT = 3;

// Legacy rollup event (pre-BoLD)
const LEGACY_ROLLUP_ABI = [
  'event NodeCreated(uint64 indexed nodeNum, bytes32 indexed parentNodeHash, bytes32 indexed nodeHash, bytes32 executionHash, tuple(tuple(tuple(bytes32[2] bytes32Vals, uint64[2] u64Vals) globalState, uint8 machineStatus) beforeState, tuple(tuple(bytes32[2] bytes32Vals, uint64[2] u64Vals) globalState, uint8 machineStatus) afterState, uint64 numBlocks) assertion, bytes32 afterInboxBatchAcc, bytes32 wasmModuleRoot, uint256 inboxMaxCount)',
];

// BoLD rollup event
const BOLD_ROLLUP_ABI = [
  'event AssertionCreated(bytes32 indexed assertionHash, bytes32 indexed parentAssertionHash, tuple(tuple(bytes32 prevPrevAssertionHash, bytes32 sequencerBatchAcc, tuple(bytes32 wasmModuleRoot, uint256 requiredStake, address challengeManager, uint64 confirmPeriodBlocks, uint64 nextInboxPosition) configData) beforeStateData, tuple(tuple(bytes32[2] bytes32Vals, uint64[2] u64Vals) globalState, uint8 machineStatus, bytes32 endHistoryRoot) beforeState, tuple(tuple(bytes32[2] bytes32Vals, uint64[2] u64Vals) globalState, uint8 machineStatus, bytes32 endHistoryRoot) afterState) assertion, bytes32 afterInboxBatchAcc, uint256 inboxMaxCount, bytes32 wasmModuleRoot, uint256 requiredStake, address challengeManager, uint64 confirmPeriodBlocks)',
];

const SEQUENCER_INBOX_ABI = [
  'event SequencerBatchDelivered(uint256 indexed batchSequenceNumber, bytes32 indexed beforeAcc, bytes32 indexed afterAcc, bytes32 delayedAcc, uint256 afterDelayedMessagesRead, tuple(uint64 minTimestamp, uint64 maxTimestamp, uint64 minBlockNumber, uint64 maxBlockNumber) timeBounds, uint8 dataLocation)',
  'function addSequencerL2Batch(uint256 sequenceNumber, bytes data, uint256 afterDelayedMessagesRead, address gasRefunder, uint256 prevMessageCount, uint256 newMessageCount)',
  'function addSequencerL2BatchFromOrigin(uint256 sequenceNumber, bytes data, uint256 afterDelayedMessagesRead, address gasRefunder)',
  'function addSequencerL2BatchFromOrigin(uint256 sequenceNumber, bytes data, uint256 afterDelayedMessagesRead, address gasRefunder, uint256 prevMessageCount, uint256 newMessageCount)',
];

const sequencerInboxInterface = new ethers.utils.Interface(SEQUENCER_INBOX_ABI);
const seenUnknownBatchSelectors = new Set<string>();
const seenUnexpectedBatchShapes = new Set<string>();

/** Resolve an RPC URL from the project's existing env-var RPCs (Alchemy / Infura keys). Returns null if no configured URL is found; callers fall back to getParentChainInfo. */
function loadConfiguredParentRpcUrl(parentChainId: number): string | null {
  switch (parentChainId) {
    case 1: // Ethereum Mainnet
      return (
        (process.env.NEXT_PUBLIC_ALCHEMY_KEY_ETHEREUM
          ? `https://eth-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_KEY_ETHEREUM}`
          : '') ||
        (process.env.NEXT_PUBLIC_INFURA_KEY_ETHEREUM
          ? `https://mainnet.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_KEY_ETHEREUM}`
          : '') ||
        process.env.NEXT_PUBLIC_RPC_URL_ETHEREUM ||
        null
      );
    case 42161: // Arbitrum One
      return (
        (process.env.NEXT_PUBLIC_ALCHEMY_KEY_ARBITRUM_ONE
          ? `https://arb-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_KEY_ARBITRUM_ONE}`
          : '') ||
        (process.env.NEXT_PUBLIC_INFURA_KEY_ARBITRUM_ONE
          ? `https://arbitrum-mainnet.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_KEY_ARBITRUM_ONE}`
          : '') ||
        process.env.NEXT_PUBLIC_RPC_URL_ARBITRUM_ONE ||
        null
      );
    case 42170: // Arbitrum Nova
      return (
        (process.env.NEXT_PUBLIC_ALCHEMY_KEY_ARBITRUM_NOVA
          ? `https://arbnova-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_KEY_ARBITRUM_NOVA}`
          : '') ||
        process.env.NEXT_PUBLIC_RPC_URL_ARBITRUM_NOVA ||
        'https://nova.arbitrum.io/rpc'
      );
    case 8453: // Base
      return (
        (process.env.NEXT_PUBLIC_ALCHEMY_KEY_BASE
          ? `https://base-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_KEY_BASE}`
          : '') ||
        (process.env.NEXT_PUBLIC_INFURA_KEY_BASE
          ? `https://base-mainnet.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_KEY_BASE}`
          : '') ||
        process.env.NEXT_PUBLIC_RPC_URL_BASE ||
        null
      );
    default:
      return null;
  }
}

function getParentProvider(parentChainId: number): ethers.providers.JsonRpcProvider {
  const { rpcUrl } = getParentChainInfo(parentChainId);
  return new ethers.providers.JsonRpcProvider(loadConfiguredParentRpcUrl(parentChainId) || rpcUrl);
}

export function median(values: number[]): number {
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

function getMaxLookbackBlocks(parentChainId: number): number {
  return getLookbackBlocks(parentChainId) * MAX_LOOKBACK_MULTIPLIER;
}

function getQueryWindowBlocks(parentChainId: number): number {
  switch (parentChainId) {
    case 1: // Ethereum Mainnet — free RPCs cap at 30K
      return 25_000;
    case 8453: // Base — free RPCs cap at 10K
      return 9_000;
    default: // Arbitrum chains — larger ranges supported
      return 200_000;
  }
}

function compareByBlockAndLog<T extends { blockNumber: number; logIndex: number }>(a: T, b: T) {
  return a.blockNumber - b.blockNumber || a.logIndex - b.logIndex;
}

function isAfterEvent(
  candidate: { blockNumber: number; logIndex: number },
  reference: { blockNumber: number; logIndex: number },
) {
  return compareByBlockAndLog(candidate, reference) > 0;
}

async function mapWithConcurrencyLimit<T, R>(
  values: T[],
  concurrency: number,
  mapper: (value: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(values.length);
  let nextIndex = 0;

  async function worker() {
    while (true) {
      const currentIndex = nextIndex;
      nextIndex++;

      if (currentIndex >= values.length) {
        return;
      }

      // eslint-disable-next-line no-await-in-loop -- intentional serial execution within each worker
      results[currentIndex] = await mapper(values[currentIndex]!, currentIndex);
    }
  }

  const workerCount = Math.min(concurrency, values.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  return results;
}

async function queryAssertionEventsInRange(
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
      ? legacyContract.queryFilter(legacyFilter, fromBlock, toBlock)
      : Promise.resolve([]),
    boldFilter ? boldContract.queryFilter(boldFilter, fromBlock, toBlock) : Promise.resolve([]),
  ]);

  return [...legacyEvents, ...boldEvents].sort(compareByBlockAndLog);
}

async function queryRecentAssertionEvents(
  rollupAddress: string,
  parentChainId: number,
  provider: ethers.providers.JsonRpcProvider,
): Promise<ethers.Event[]> {
  const latestBlock = await provider.getBlockNumber();
  const minBlock = Math.max(0, latestBlock - getMaxLookbackBlocks(parentChainId));
  const windowSize = getQueryWindowBlocks(parentChainId);

  const assertionEvents: ethers.Event[] = [];
  let toBlock = latestBlock;

  while (toBlock >= minBlock && assertionEvents.length < TARGET_ASSERTION_COUNT) {
    const fromBlock = Math.max(minBlock, toBlock - windowSize + 1);
    // eslint-disable-next-line no-await-in-loop
    const events = await queryAssertionEventsInRange(rollupAddress, provider, fromBlock, toBlock);
    assertionEvents.unshift(...events);
    toBlock = fromBlock - 1;
  }

  return assertionEvents.sort(compareByBlockAndLog).slice(-TARGET_ASSERTION_COUNT);
}

async function queryBatchEventsInRange(
  sequencerInboxAddress: string,
  provider: ethers.providers.JsonRpcProvider,
  fromBlock: number,
  toBlock: number,
): Promise<ethers.Event[]> {
  const sequencerInbox = new ethers.Contract(sequencerInboxAddress, SEQUENCER_INBOX_ABI, provider);
  const filter = sequencerInbox.filters.SequencerBatchDelivered?.();

  if (!filter) {
    return [];
  }

  return (await sequencerInbox.queryFilter(filter, fromBlock, toBlock)).sort(compareByBlockAndLog);
}

async function queryBatchEvents(
  sequencerInboxAddress: string,
  parentChainId: number,
  provider: ethers.providers.JsonRpcProvider,
  fromBlock: number,
  toBlock: number,
): Promise<ethers.Event[]> {
  const windowSize = getQueryWindowBlocks(parentChainId);
  const batchEvents: ethers.Event[] = [];
  let currentToBlock = toBlock;

  while (currentToBlock >= fromBlock) {
    const currentFromBlock = Math.max(fromBlock, currentToBlock - windowSize + 1);
    // eslint-disable-next-line no-await-in-loop
    const events = await queryBatchEventsInRange(
      sequencerInboxAddress,
      provider,
      currentFromBlock,
      currentToBlock,
    );
    batchEvents.unshift(...events);
    currentToBlock = currentFromBlock - 1;
  }

  return batchEvents.sort(compareByBlockAndLog);
}

async function fetchBlocksByNumber(
  provider: ethers.providers.JsonRpcProvider,
  blockNumbers: number[],
): Promise<Map<number, ethers.providers.Block>> {
  const uniqueBlockNumbers = [...new Set(blockNumbers)];
  const blocks = await mapWithConcurrencyLimit(
    uniqueBlockNumbers,
    RPC_CONCURRENCY_LIMIT,
    (blockNumber) => provider.getBlock(blockNumber),
  );

  return new Map(
    uniqueBlockNumbers.map((blockNumber, index) => {
      const block = blocks[index];

      if (!block) {
        throw new Error(`Missing block ${blockNumber}`);
      }

      return [blockNumber, block];
    }),
  );
}

function getAssertionAccumulator(event: ethers.Event): string {
  const afterInboxBatchAcc = event.args?.afterInboxBatchAcc;

  if (typeof afterInboxBatchAcc !== 'string') {
    throw new Error(`Assertion event missing afterInboxBatchAcc at ${event.transactionHash}`);
  }

  return afterInboxBatchAcc.toLowerCase();
}

async function normalizeAssertionEvents(
  provider: ethers.providers.JsonRpcProvider,
  events: ethers.Event[],
): Promise<AssertionEventRecord[]> {
  const blocksByNumber = await fetchBlocksByNumber(
    provider,
    events.map((event) => event.blockNumber),
  );

  return events.map((event) => ({
    afterInboxBatchAcc: getAssertionAccumulator(event),
    blockNumber: event.blockNumber,
    logIndex: event.logIndex,
    timestamp: blocksByNumber.get(event.blockNumber)!.timestamp,
  }));
}

export function isMessageBearingBatchTransaction(data: string): boolean {
  let parsedTransaction: ethers.utils.TransactionDescription | null = null;

  try {
    parsedTransaction = sequencerInboxInterface.parseTransaction({ data });
  } catch (error) {
    const selector = data.slice(0, 10);
    if (!seenUnknownBatchSelectors.has(selector)) {
      seenUnknownBatchSelectors.add(selector);
      console.warn(`    unknown batch poster selector ${selector}, treating as message-bearing`);
    }
    return true;
  }

  if (!parsedTransaction) {
    console.warn(
      '    unable to decode sequencer inbox batch transaction, treating as message-bearing',
    );
    return true;
  }

  if (
    parsedTransaction.name === 'addSequencerL2BatchFromOrigin' &&
    parsedTransaction.args.length === 4
  ) {
    return true;
  }

  if (parsedTransaction.args.length < 6) {
    if (!seenUnexpectedBatchShapes.has(parsedTransaction.signature)) {
      seenUnexpectedBatchShapes.add(parsedTransaction.signature);
      console.warn(
        `    unexpected batch poster transaction shape ${parsedTransaction.signature}, treating as message-bearing`,
      );
    }
    return true;
  }

  const previousMessageCount = ethers.BigNumber.from(parsedTransaction.args[4]);
  const newMessageCount = ethers.BigNumber.from(parsedTransaction.args[5]);

  return newMessageCount.gt(previousMessageCount);
}

async function normalizeBatchEvents(
  provider: ethers.providers.JsonRpcProvider,
  events: ethers.Event[],
): Promise<SequencerBatchRecord[]> {
  const uniqueTransactionHashes = [...new Set(events.map((event) => event.transactionHash))];
  const [blocksByNumber, transactionsByHash] = await Promise.all([
    fetchBlocksByNumber(
      provider,
      events.map((event) => event.blockNumber),
    ),
    mapWithConcurrencyLimit(
      uniqueTransactionHashes,
      RPC_CONCURRENCY_LIMIT,
      async (transactionHash) => {
        const transaction = await provider.getTransaction(transactionHash);

        if (!transaction) {
          throw new Error(`Missing transaction ${transactionHash}`);
        }

        return [transactionHash, transaction] as const;
      },
    ).then((entries) => new Map(entries)),
  ]);

  return events.map((event) => {
    const afterAcc = event.args?.afterAcc;

    if (typeof afterAcc !== 'string') {
      throw new Error(`Sequencer batch event missing afterAcc at ${event.transactionHash}`);
    }

    const transaction = transactionsByHash.get(event.transactionHash);

    if (!transaction) {
      throw new Error(`Missing transaction ${event.transactionHash}`);
    }

    return {
      afterAcc: afterAcc.toLowerCase(),
      blockNumber: event.blockNumber,
      logIndex: event.logIndex,
      timestamp: blocksByNumber.get(event.blockNumber)!.timestamp,
      isMessageBearing: isMessageBearingBatchTransaction(transaction.data),
    };
  });
}

export function buildDelaySamples(
  assertions: AssertionEventRecord[],
  batches: SequencerBatchRecord[],
): DelaySample[] {
  const sortedAssertions = [...assertions].sort(compareByBlockAndLog);
  const sortedBatches = [...batches].sort(compareByBlockAndLog);
  const batchIndexByAccumulator = new Map(
    sortedBatches.map((batch, index) => [batch.afterAcc, index] as const),
  );
  const finalIncludedBatchIndexByAssertion = sortedAssertions.map((assertion) => {
    const batchIndex = batchIndexByAccumulator.get(assertion.afterInboxBatchAcc);
    return typeof batchIndex === 'number' ? batchIndex : null;
  });
  const samples: DelaySample[] = [];

  for (let index = 1; index < sortedAssertions.length; index++) {
    const previousAssertion = sortedAssertions[index - 1]!;
    const firstNonEmptyBatchIndex = sortedBatches.findIndex(
      (batch) =>
        batch.isMessageBearing &&
        isAfterEvent(batch, previousAssertion) &&
        finalIncludedBatchIndexByAssertion
          .slice(index)
          .some(
            (finalIncludedBatchIndex) =>
              typeof finalIncludedBatchIndex === 'number' && finalIncludedBatchIndex >= 0,
          ),
    );

    if (firstNonEmptyBatchIndex === -1) {
      continue;
    }

    const firstNonEmptyBatch = sortedBatches[firstNonEmptyBatchIndex]!;

    const assertionIndexThatIncludesBatch = finalIncludedBatchIndexByAssertion.findIndex(
      (finalIncludedBatchIndex, assertionIndex) =>
        assertionIndex >= index &&
        typeof finalIncludedBatchIndex === 'number' &&
        finalIncludedBatchIndex >= firstNonEmptyBatchIndex,
    );

    if (assertionIndexThatIncludesBatch === -1) {
      continue;
    }

    const assertionThatIncludesBatch = sortedAssertions[assertionIndexThatIncludesBatch]!;

    samples.push({
      batchPostingDelaySeconds: firstNonEmptyBatch.timestamp - previousAssertion.timestamp,
      assertionAfterBatchDelaySeconds:
        assertionThatIncludesBatch.timestamp - firstNonEmptyBatch.timestamp,
    });
  }

  return samples;
}

function getDelayEstimateFromSamples(samples: DelaySample[]): DelayEstimateResult {
  if (samples.length < MIN_COMPLETE_CYCLE_COUNT) {
    return { status: 'insufficient_data' };
  }

  const recentSamples = samples.slice(-SAMPLE_SIZE);

  return {
    status: 'ok',
    estimate: {
      assertionIntervalSeconds: Math.round(
        median(
          recentSamples.map(
            (sample) => sample.batchPostingDelaySeconds + sample.assertionAfterBatchDelaySeconds,
          ),
        ),
      ),
    },
    sampleCount: recentSamples.length,
  };
}

async function getDelayEstimate(
  chain: OrbitChainConfig,
  provider: ethers.providers.JsonRpcProvider,
): Promise<DelayEstimateResult> {
  const startedAt = Date.now();
  const assertionEvents = await queryRecentAssertionEvents(
    chain.ethBridge.rollup,
    chain.parentChainId,
    provider,
  );
  console.log(
    `    fetched ${assertionEvents.length} assertion events in ${Date.now() - startedAt}ms`,
  );

  if (assertionEvents.length < 2) {
    console.warn(
      `  ${chain.name} (${chain.chainId}): <2 assertions in lookback window, preserving current value`,
    );
    return { status: 'insufficient_data' };
  }

  const oldestAssertionBlock = assertionEvents[0]!.blockNumber;
  const latestAssertionBlock = assertionEvents[assertionEvents.length - 1]!.blockNumber;
  const batchEvents = await queryBatchEvents(
    chain.ethBridge.sequencerInbox,
    chain.parentChainId,
    provider,
    oldestAssertionBlock,
    latestAssertionBlock,
  );
  console.log(`    fetched ${batchEvents.length} batch events in ${Date.now() - startedAt}ms`);

  const [assertions, batches] = await Promise.all([
    normalizeAssertionEvents(provider, assertionEvents),
    normalizeBatchEvents(provider, batchEvents),
  ]);
  console.log(
    `    normalized ${assertions.length} assertions and ${batches.length} batches in ${Date.now() - startedAt}ms`,
  );

  const samples = buildDelaySamples(assertions, batches);
  console.log(`    built ${samples.length} complete cycles in ${Date.now() - startedAt}ms`);
  const result = getDelayEstimateFromSamples(samples);

  if (result.status === 'insufficient_data') {
    console.warn(
      `  ${chain.name} (${chain.chainId}): <${MIN_COMPLETE_CYCLE_COUNT} complete cycles, preserving current value`,
    );
    return result;
  }

  console.log(
    `  ${chain.name} (${chain.chainId}): assertionInterval=${result.estimate.assertionIntervalSeconds}s samples=${result.sampleCount}`,
  );

  return result;
}

export function applyDelayEstimates(
  data: OrbitChainsData,
  delayEstimatesByChainId: Map<number, DelayEstimate>,
): number {
  let updatedChains = 0;

  for (const section of ['mainnet', 'testnet'] as const) {
    for (const chain of data[section]) {
      const estimate = delayEstimatesByChainId.get(chain.chainId);

      if (!estimate) {
        continue;
      }

      chain.bridgeUiConfig.assertionIntervalSeconds = estimate.assertionIntervalSeconds;
      updatedChains++;
    }
  }

  return updatedChains;
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

  const delayEstimatesByChainId = new Map<number, DelayEstimate>();
  const failedChains: { name: string; chainId: number; error: string }[] = [];

  for (const [parentChainId, chains] of chainsByParent) {
    console.log(`\nParent chain ${parentChainId}:`);
    const provider = getParentProvider(parentChainId);

    for (const chain of chains) {
      try {
        console.log(`  Processing ${chain.name} (${chain.chainId})...`);
        // eslint-disable-next-line no-await-in-loop
        const result = await getDelayEstimate(chain, provider);
        if (result.status === 'ok') {
          delayEstimatesByChainId.set(chain.chainId, result.estimate);
        } else {
          console.log(`  ${chain.name} (${chain.chainId}): preserving existing value`);
        }
      } catch (error) {
        const errorMessage = (error as Error).message;
        console.error(
          `  Failed to update assertion interval for ${chain.name} (${chain.chainId}): ${errorMessage}`,
        );
        failedChains.push({ name: chain.name, chainId: chain.chainId, error: errorMessage });
      }
    }
  }

  if (failedChains.length > 0) {
    console.error(`\n${failedChains.length} chain(s) failed during processing:`);
    for (const failed of failedChains) {
      console.error(`  - ${failed.name} (${failed.chainId}): ${failed.error}`);
    }
  }

  const updatedChains = applyDelayEstimates(data, delayEstimatesByChainId);

  fs.writeFileSync(jsonPath, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`\nUpdated ${updatedChains} chains in ${jsonPath}`);

  if (failedChains.length > 0) {
    throw new Error(
      `${failedChains.length} chain(s) failed to update. Successful results have been written.`,
    );
  }
}
