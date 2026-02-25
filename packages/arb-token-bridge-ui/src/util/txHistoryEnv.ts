import { z } from 'zod';

const positiveIntSchema = z.coerce.number().int().positive();

const txHistoryEnvSchema = z.object({
  NEXT_PUBLIC_TX_HISTORY_BATCH_PARALLELISM: positiveIntSchema.catch(10),
  NEXT_PUBLIC_TX_HISTORY_TRANSFORM_PARALLELISM: positiveIntSchema.catch(3),
  NEXT_PUBLIC_TX_HISTORY_PAUSE_SIZE_DAYS: positiveIntSchema.catch(30),
  NEXT_PUBLIC_TX_HISTORY_PAGE_SIZE: positiveIntSchema.catch(1_000),
  NEXT_PUBLIC_TX_HISTORY_BATCH_BLOCKS_DEFAULT: positiveIntSchema.catch(5_000_000),
  NEXT_PUBLIC_TX_HISTORY_BATCH_BLOCKS_APECHAIN: positiveIntSchema.catch(5_000_000),
  NEXT_PUBLIC_TX_HISTORY_BATCH_BLOCKS_MUSTER: positiveIntSchema.catch(10_000),
  NEXT_PUBLIC_TX_HISTORY_BATCH_BLOCKS_TREX: positiveIntSchema.catch(10_000),
  NEXT_PUBLIC_TX_HISTORY_SWR_DEDUPING_INTERVAL_MS: positiveIntSchema.catch(1_000_000),
  NEXT_PUBLIC_TX_HISTORY_ALCHEMY_DELAY_MS: z.coerce.number().int().min(0).catch(2_000),
  NEXT_PUBLIC_TX_HISTORY_TIMESTAMP_ENRICH_CONCURRENCY: z.coerce
    .number()
    .int()
    .min(0)
    .catch(0)
    .transform((value) => (value === 0 ? Number.MAX_SAFE_INTEGER : value)),
});

const env = txHistoryEnvSchema.parse(process.env);

export const txHistoryEnv = {
  batchParallelism: env.NEXT_PUBLIC_TX_HISTORY_BATCH_PARALLELISM,
  transformParallelism: env.NEXT_PUBLIC_TX_HISTORY_TRANSFORM_PARALLELISM,
  pauseSizeDays: env.NEXT_PUBLIC_TX_HISTORY_PAUSE_SIZE_DAYS,
  pageSize: env.NEXT_PUBLIC_TX_HISTORY_PAGE_SIZE,
  batchBlocksDefault: env.NEXT_PUBLIC_TX_HISTORY_BATCH_BLOCKS_DEFAULT,
  batchBlocksApeChain: env.NEXT_PUBLIC_TX_HISTORY_BATCH_BLOCKS_APECHAIN,
  batchBlocksMuster: env.NEXT_PUBLIC_TX_HISTORY_BATCH_BLOCKS_MUSTER,
  batchBlocksTrex: env.NEXT_PUBLIC_TX_HISTORY_BATCH_BLOCKS_TREX,
  swrDedupingIntervalMs: env.NEXT_PUBLIC_TX_HISTORY_SWR_DEDUPING_INTERVAL_MS,
  alchemyDelayMs: env.NEXT_PUBLIC_TX_HISTORY_ALCHEMY_DELAY_MS,
  timestampEnrichConcurrency: env.NEXT_PUBLIC_TX_HISTORY_TIMESTAMP_ENRICH_CONCURRENCY,
} as const;
