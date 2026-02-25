function readInt(raw: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(raw ?? '', 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function readPositiveInt(raw: string | undefined, fallback: number): number {
  return Math.max(1, readInt(raw, fallback));
}

function readNonNegativeInt(raw: string | undefined, fallback: number): number {
  return Math.max(0, readInt(raw, fallback));
}

export const txHistoryEnv = {
  batchParallelism: readPositiveInt(process.env.NEXT_PUBLIC_TX_HISTORY_BATCH_PARALLELISM, 10),
  transformParallelism: readPositiveInt(process.env.NEXT_PUBLIC_TX_HISTORY_TRANSFORM_PARALLELISM, 3),
  pauseSizeDays: readPositiveInt(process.env.NEXT_PUBLIC_TX_HISTORY_PAUSE_SIZE_DAYS, 30),
  pageSize: readPositiveInt(process.env.NEXT_PUBLIC_TX_HISTORY_PAGE_SIZE, 1_000),
  batchBlocksDefault: readPositiveInt(process.env.NEXT_PUBLIC_TX_HISTORY_BATCH_BLOCKS_DEFAULT, 5_000_000),
  batchBlocksApeChain: readPositiveInt(process.env.NEXT_PUBLIC_TX_HISTORY_BATCH_BLOCKS_APECHAIN, 5_000_000),
  batchBlocksMuster: readPositiveInt(process.env.NEXT_PUBLIC_TX_HISTORY_BATCH_BLOCKS_MUSTER, 10_000),
  batchBlocksTrex: readPositiveInt(process.env.NEXT_PUBLIC_TX_HISTORY_BATCH_BLOCKS_TREX, 10_000),
  swrDedupingIntervalMs: readPositiveInt(
    process.env.NEXT_PUBLIC_TX_HISTORY_SWR_DEDUPING_INTERVAL_MS,
    1_000_000,
  ),
  alchemyDelayMs: readNonNegativeInt(process.env.NEXT_PUBLIC_TX_HISTORY_ALCHEMY_DELAY_MS, 2_000),
  timestampEnrichConcurrency:
    readNonNegativeInt(process.env.NEXT_PUBLIC_TX_HISTORY_TIMESTAMP_ENRICH_CONCURRENCY, 0) ||
    Number.MAX_SAFE_INTEGER,
} as const;
