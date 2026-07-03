import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getLayerZeroOftInfo,
  getLayerZeroOftInfoFromMetadata,
  resetLayerZeroMetadataCache,
} from './layerZeroMetadata';

// Synthetic trimmed-metadata fixtures — these exercise the parsing/root-linking
// logic against controlled input. Real-token, live-network behavior is covered
// in layerZeroMetadata.integration.test.ts.
const PARENT_CHAIN_ID = 111;
const CHILD_CHAIN_ID = 222;

const NATIVE_TOKEN = '0x00000000000000000000000000000000000000a1'; // native on parent chain
const NATIVE_TOKEN_ON_CHILD = '0x00000000000000000000000000000000000000b1';
const MULTI_TOKEN = '0x00000000000000000000000000000000000000a2'; // native, with 2 child deployments
const MULTI_TOKEN_ON_CHILD_1 = '0x00000000000000000000000000000000000000b2';
const MULTI_TOKEN_ON_CHILD_2 = '0x00000000000000000000000000000000000000b3';
const UNLISTED_TOKEN = '0x00000000000000000000000000000000000000ff';

const metadata = {
  parent: {
    chainDetails: { nativeChainId: PARENT_CHAIN_ID },
    tokens: {
      [NATIVE_TOKEN]: {}, // no peggedTo → native/home token
      [MULTI_TOKEN]: {},
    },
  },
  child: {
    chainDetails: { nativeChainId: CHILD_CHAIN_ID },
    tokens: {
      [NATIVE_TOKEN_ON_CHILD]: { peggedTo: { address: NATIVE_TOKEN, chainName: 'parent' } },
      [MULTI_TOKEN_ON_CHILD_1]: { peggedTo: { address: MULTI_TOKEN, chainName: 'parent' } },
      [MULTI_TOKEN_ON_CHILD_2]: { peggedTo: { address: MULTI_TOKEN, chainName: 'parent' } },
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
          parentChainId: PARENT_CHAIN_ID,
          parentTokenAddress: UNLISTED_TOKEN,
          childChainId: CHILD_CHAIN_ID,
        }),
      ).toEqual({ isOft: false, childTokenAddresses: [] });
    });

    it('finds every child deployment linked to the same native token', () => {
      const { isOft, childTokenAddresses } = getLayerZeroOftInfoFromMetadata(metadata, {
        parentChainId: PARENT_CHAIN_ID,
        parentTokenAddress: MULTI_TOKEN,
        childChainId: CHILD_CHAIN_ID,
      });

      expect(isOft).toBe(true);
      expect([...childTokenAddresses].sort()).toEqual(
        [MULTI_TOKEN_ON_CHILD_1, MULTI_TOKEN_ON_CHILD_2].sort(),
      );
    });

    it('matches the parent token case-insensitively', () => {
      expect(
        getLayerZeroOftInfoFromMetadata(metadata, {
          parentChainId: PARENT_CHAIN_ID,
          parentTokenAddress: NATIVE_TOKEN.toUpperCase().replace('0X', '0x'),
          childChainId: CHILD_CHAIN_ID,
        }),
      ).toEqual({ isOft: true, childTokenAddresses: [NATIVE_TOKEN_ON_CHILD] });
    });

    it('reports OFT with no child deployments when the destination chain is unknown', () => {
      expect(
        getLayerZeroOftInfoFromMetadata(metadata, {
          parentChainId: PARENT_CHAIN_ID,
          parentTokenAddress: NATIVE_TOKEN,
          childChainId: 999999, // not in metadata
        }),
      ).toEqual({ isOft: true, childTokenAddresses: [] });
    });

    it('resolves the native root when the parent token is itself a representation', () => {
      // parent = the child-chain representation, child = the home chain → the root token itself
      expect(
        getLayerZeroOftInfoFromMetadata(metadata, {
          parentChainId: CHILD_CHAIN_ID,
          parentTokenAddress: NATIVE_TOKEN_ON_CHILD,
          childChainId: PARENT_CHAIN_ID,
        }),
      ).toEqual({ isOft: true, childTokenAddresses: [NATIVE_TOKEN] });
    });
  });

  // The metadata is untrusted external JSON, so malformed shapes must be tolerated.
  describe('malformed metadata', () => {
    it.each([null, undefined, 42, 'not-an-object', []])('treats %p as not OFT', (badMetadata) => {
      expect(
        getLayerZeroOftInfoFromMetadata(badMetadata, {
          parentChainId: PARENT_CHAIN_ID,
          parentTokenAddress: NATIVE_TOKEN,
          childChainId: CHILD_CHAIN_ID,
        }),
      ).toEqual({ isOft: false, childTokenAddresses: [] });
    });

    it('matches chains whose nativeChainId is a numeric string', () => {
      expect(
        getLayerZeroOftInfoFromMetadata(
          {
            parent: { chainDetails: { nativeChainId: '111' }, tokens: { [NATIVE_TOKEN]: {} } },
            child: {
              chainDetails: { nativeChainId: '222' },
              tokens: {
                [NATIVE_TOKEN_ON_CHILD]: {
                  peggedTo: { address: NATIVE_TOKEN, chainName: 'parent' },
                },
              },
            },
          },
          {
            parentChainId: PARENT_CHAIN_ID,
            parentTokenAddress: NATIVE_TOKEN,
            childChainId: CHILD_CHAIN_ID,
          },
        ),
      ).toEqual({ isOft: true, childTokenAddresses: [NATIVE_TOKEN_ON_CHILD] });
    });

    it('ignores chains with missing or invalid chainDetails', () => {
      expect(
        getLayerZeroOftInfoFromMetadata(
          { parent: { tokens: { [NATIVE_TOKEN]: {} } } }, // no chainDetails
          {
            parentChainId: PARENT_CHAIN_ID,
            parentTokenAddress: NATIVE_TOKEN,
            childChainId: CHILD_CHAIN_ID,
          },
        ),
      ).toEqual({ isOft: false, childTokenAddresses: [] });
    });

    it('skips malformed token entries and incomplete pegged links on the child chain', () => {
      expect(
        getLayerZeroOftInfoFromMetadata(
          {
            parent: {
              chainDetails: { nativeChainId: PARENT_CHAIN_ID },
              tokens: { [NATIVE_TOKEN]: {} },
            },
            child: {
              chainDetails: { nativeChainId: CHILD_CHAIN_ID },
              tokens: {
                [NATIVE_TOKEN_ON_CHILD]: {
                  peggedTo: { address: NATIVE_TOKEN, chainName: 'parent' },
                },
                [MULTI_TOKEN_ON_CHILD_1]: null, // malformed entry
                [MULTI_TOKEN_ON_CHILD_2]: { peggedTo: { address: NATIVE_TOKEN } }, // missing chainName
              },
            },
          },
          {
            parentChainId: PARENT_CHAIN_ID,
            parentTokenAddress: NATIVE_TOKEN,
            childChainId: CHILD_CHAIN_ID,
          },
        ),
      ).toEqual({ isOft: true, childTokenAddresses: [NATIVE_TOKEN_ON_CHILD] });
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
      parentChainId: PARENT_CHAIN_ID,
      parentTokenAddress: NATIVE_TOKEN,
      childChainId: CHILD_CHAIN_ID,
    });
    await getLayerZeroOftInfo({
      parentChainId: PARENT_CHAIN_ID,
      parentTokenAddress: MULTI_TOKEN,
      childChainId: CHILD_CHAIN_ID,
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
      parentChainId: PARENT_CHAIN_ID,
      parentTokenAddress: NATIVE_TOKEN,
      childChainId: CHILD_CHAIN_ID,
    });
    const second = await getLayerZeroOftInfo({
      parentChainId: PARENT_CHAIN_ID,
      parentTokenAddress: NATIVE_TOKEN,
      childChainId: CHILD_CHAIN_ID,
    });

    expect(first).toEqual({ isOft: false, childTokenAddresses: [] }); // null metadata → not found
    expect(second).toEqual({ isOft: true, childTokenAddresses: [NATIVE_TOKEN_ON_CHILD] });
    expect(fetchCallCount).toBe(2);
  });
});
