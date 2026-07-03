import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getLayerZeroOftInfo,
  getLayerZeroOftInfoFromMetadata,
  resetLayerZeroMetadataCache,
} from './layerZeroMetadata';

// Trimmed-metadata shape returned by /api/layerzero-metadata, using real addresses.
const ENA_L1 = '0x57e114b691db790c35207b2e685d4a43181e6061';
const ENA_ARB = '0x58538e6a46e07434d7e7375bc268d3cb839c0133';
const USDC_L1 = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const USDC_E_ARB = '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8';
const USDC_NATIVE_ARB = '0xaf88d065e77c8cc2239327c5edb3a432268e5831';

const metadata = {
  ethereum: {
    chainDetails: { nativeChainId: 1 },
    tokens: {
      [ENA_L1]: {}, // native ENA (no peggedTo)
      [USDC_L1]: {}, // native USDC
    },
  },
  arbitrum: {
    chainDetails: { nativeChainId: 42161 },
    tokens: {
      [ENA_ARB]: { peggedTo: { address: ENA_L1, chainName: 'ethereum' } },
      [USDC_E_ARB]: { peggedTo: { address: USDC_L1, chainName: 'ethereum' } },
      [USDC_NATIVE_ARB]: { peggedTo: { address: USDC_L1, chainName: 'ethereum' } },
    },
  },
};

beforeEach(() => {
  vi.restoreAllMocks();
  resetLayerZeroMetadataCache();
});

describe('getLayerZeroOftInfoFromMetadata', () => {
  describe('valid metadata', () => {
    it('reports a token that is not in the metadata as not OFT', () => {
      expect(
        getLayerZeroOftInfoFromMetadata(metadata, {
          parentChainId: 1,
          parentTokenAddress: '0x1111111111111111111111111111111111111111',
          childChainId: 42161,
        }),
      ).toEqual({ isOft: false, childTokenAddresses: [] });
    });

    it('finds every child deployment linked to the same native token', () => {
      const { isOft, childTokenAddresses } = getLayerZeroOftInfoFromMetadata(metadata, {
        parentChainId: 1,
        parentTokenAddress: USDC_L1,
        childChainId: 42161,
      });

      expect(isOft).toBe(true);
      expect([...childTokenAddresses].sort()).toEqual([USDC_NATIVE_ARB, USDC_E_ARB].sort());
    });

    it('matches the parent token case-insensitively', () => {
      expect(
        getLayerZeroOftInfoFromMetadata(metadata, {
          parentChainId: 1,
          parentTokenAddress: ENA_L1.toUpperCase().replace('0X', '0x'),
          childChainId: 42161,
        }),
      ).toEqual({ isOft: true, childTokenAddresses: [ENA_ARB] });
    });

    it('reports OFT with no child deployments when the destination chain is unknown', () => {
      expect(
        getLayerZeroOftInfoFromMetadata(metadata, {
          parentChainId: 1,
          parentTokenAddress: ENA_L1,
          childChainId: 999999, // not in metadata
        }),
      ).toEqual({ isOft: true, childTokenAddresses: [] });
    });

    it('resolves the native root when the parent token is itself a representation', () => {
      // parent = ENA on Arbitrum (pegged to ethereum), child = ethereum → the root token itself
      expect(
        getLayerZeroOftInfoFromMetadata(metadata, {
          parentChainId: 42161,
          parentTokenAddress: ENA_ARB,
          childChainId: 1,
        }),
      ).toEqual({ isOft: true, childTokenAddresses: [ENA_L1] });
    });
  });

  // The metadata is untrusted external JSON, so malformed shapes must be tolerated.
  describe('malformed metadata', () => {
    it.each([null, undefined, 42, 'not-an-object', []])('treats %p as not OFT', (badMetadata) => {
      expect(
        getLayerZeroOftInfoFromMetadata(badMetadata, {
          parentChainId: 1,
          parentTokenAddress: ENA_L1,
          childChainId: 42161,
        }),
      ).toEqual({ isOft: false, childTokenAddresses: [] });
    });

    it('matches chains whose nativeChainId is a numeric string', () => {
      expect(
        getLayerZeroOftInfoFromMetadata(
          {
            ethereum: { chainDetails: { nativeChainId: '1' }, tokens: { [ENA_L1]: {} } },
            arbitrum: {
              chainDetails: { nativeChainId: '42161' },
              tokens: { [ENA_ARB]: { peggedTo: { address: ENA_L1, chainName: 'ethereum' } } },
            },
          },
          { parentChainId: 1, parentTokenAddress: ENA_L1, childChainId: 42161 },
        ),
      ).toEqual({ isOft: true, childTokenAddresses: [ENA_ARB] });
    });

    it('ignores chains with missing or invalid chainDetails', () => {
      expect(
        getLayerZeroOftInfoFromMetadata(
          { ethereum: { tokens: { [ENA_L1]: {} } } }, // no chainDetails
          { parentChainId: 1, parentTokenAddress: ENA_L1, childChainId: 42161 },
        ),
      ).toEqual({ isOft: false, childTokenAddresses: [] });
    });

    it('skips malformed token entries and incomplete pegged links on the child chain', () => {
      expect(
        getLayerZeroOftInfoFromMetadata(
          {
            ethereum: { chainDetails: { nativeChainId: 1 }, tokens: { [ENA_L1]: {} } },
            arbitrum: {
              chainDetails: { nativeChainId: 42161 },
              tokens: {
                [ENA_ARB]: { peggedTo: { address: ENA_L1, chainName: 'ethereum' } },
                '0x000000000000000000000000000000000000dead': null, // malformed entry
                '0x000000000000000000000000000000000000beef': { peggedTo: { address: ENA_L1 } }, // missing chainName
              },
            },
          },
          { parentChainId: 1, parentTokenAddress: ENA_L1, childChainId: 42161 },
        ),
      ).toEqual({ isOft: true, childTokenAddresses: [ENA_ARB] });
    });
  });
});

// Sequential: these share the module-level metadata cache, so they must not run
// concurrently (the suite runs tests concurrently by default).
describe.sequential('getLayerZeroOftInfo (fetch + cache)', () => {
  // Local fetch counter rather than the spy's call count, which can carry over
  // from another test's `vi.spyOn(globalThis, 'fetch')`.
  it('fetches once and caches the response across calls', async () => {
    let fetchCallCount = 0;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      fetchCallCount += 1;
      return { ok: true, json: async () => metadata } as Response;
    });

    await getLayerZeroOftInfo({
      parentChainId: 1,
      parentTokenAddress: ENA_L1,
      childChainId: 42161,
    });
    await getLayerZeroOftInfo({
      parentChainId: 1,
      parentTokenAddress: USDC_L1,
      childChainId: 42161,
    });

    expect(fetchCallCount).toBe(1);
  });

  it('retries the fetch after a failed response instead of caching the failure', async () => {
    let fetchCallCount = 0;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      fetchCallCount += 1;
      if (fetchCallCount === 1) {
        return { ok: false } as Response;
      }
      return { ok: true, json: async () => metadata } as Response;
    });

    const first = await getLayerZeroOftInfo({
      parentChainId: 1,
      parentTokenAddress: ENA_L1,
      childChainId: 42161,
    });
    const second = await getLayerZeroOftInfo({
      parentChainId: 1,
      parentTokenAddress: ENA_L1,
      childChainId: 42161,
    });

    expect(first).toEqual({ isOft: false, childTokenAddresses: [] }); // null metadata → not found
    expect(second).toEqual({ isOft: true, childTokenAddresses: [ENA_ARB] });
    expect(fetchCallCount).toBe(2);
  });
});
