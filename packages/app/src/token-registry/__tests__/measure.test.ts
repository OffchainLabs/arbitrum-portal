import { gzipSync } from 'node:zlib';
import { describe, expect, it, vi } from 'vitest';

import { getChainTokens, getRouteMap, getSwapDestinations } from '../server/generate';

// run generation directly, without Next's cache layer
vi.mock('next/cache', () => ({
  unstable_cache: (fn: (...args: never[]) => unknown) => fn,
}));

function sizeOf(value: unknown) {
  const json = JSON.stringify(value);
  const raw = Buffer.byteLength(json);
  const gzip = gzipSync(Buffer.from(json)).length;
  return `${(raw / 1024).toFixed(0)} KB raw / ${(gzip / 1024).toFixed(0)} KB gzip`;
}

/**
 * Measurement harness, not a CI test — hits the real token list and LiFi
 * APIs. Run with: MEASURE=1 pnpm vitest --run src/token-registry
 */
describe.runIf(process.env.MEASURE === '1')('token registry generation (live network)', () => {
  it('measures size and timing for Ethereum <-> Arbitrum One', async () => {
    const start = performance.now();
    const [ethereumTokens, arbitrumTokens] = await Promise.all([
      getChainTokens(1),
      getChainTokens(42161),
    ]);
    const tokensDone = performance.now();

    const deposit = await getRouteMap({ sourceChainId: 1, destinationChainId: 42161 });
    const depositDone = performance.now();

    const withdrawal = await getRouteMap({ sourceChainId: 42161, destinationChainId: 1 });
    const withdrawalDone = performance.now();

    expect(deposit).not.toBeNull();
    expect(withdrawal).not.toBeNull();

    console.log(`tokens/1:        ${ethereumTokens.length} tokens, ${sizeOf(ethereumTokens)}`);
    console.log(`tokens/42161:    ${arbitrumTokens.length} tokens, ${sizeOf(arbitrumTokens)}`);
    console.log(`  generated in ${(tokensDone - start).toFixed(0)}ms (both, parallel)`);

    for (const [label, artifact, ms] of [
      ['routes/1/42161', deposit, depositDone - tokensDone],
      ['routes/42161/1', withdrawal, withdrawalDone - depositDone],
    ] as const) {
      if (!artifact) {
        continue;
      }
      const counts = artifact.providers
        .map((section) => `${section.provider}=${Object.keys(section.routes).length}`)
        .join(', ');
      console.log(`${label}: ${counts}`);
      console.log(`  ${sizeOf(artifact)}, generated in ${ms.toFixed(0)}ms (cold, no cache)`);
    }

    const swapPairs = [
      { sourceChainId: 1, destinationChainId: 42161 },
      { sourceChainId: 42161, destinationChainId: 1 },
    ];
    const swapSets = await Promise.all(swapPairs.map((pair) => getSwapDestinations(pair)));
    swapPairs.forEach((pair, index) => {
      const swapDestinations = swapSets[index];
      console.log(
        `swap-destinations/${pair.sourceChainId}/${pair.destinationChainId}: ${swapDestinations?.length ?? 0} tokens, ${sizeOf(swapDestinations)}`,
      );
    });
  }, 180_000);
});
