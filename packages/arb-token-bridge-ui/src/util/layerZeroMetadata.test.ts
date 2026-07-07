import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getLayerZeroOftInfo,
  getLayerZeroOftInfoFromMetadata,
  isKnownLayerZeroTokenFromMetadata,
  resetLayerZeroMetadataCache,
} from './layerZeroMetadata';

// Synthetic trimmed-metadata fixtures (the shape produced by trimLayerZeroMetadata:
// keyed by chain id, with the LayerZero chainKey + tokens carrying an `isOft` flag
// and optional `peggedTo`). These exercise the parsing/root-linking logic; real-token,
// live-network behavior is covered in layerZeroMetadata.integration.test.ts.
const PARENT_CHAIN_ID = 111;
const CHILD_CHAIN_ID = 222;

const NATIVE_TOKEN = '0x00000000000000000000000000000000000000a1'; // native on parent chain
const NATIVE_TOKEN_ON_CHILD = '0x00000000000000000000000000000000000000b1';
const MULTI_TOKEN = '0x00000000000000000000000000000000000000a2'; // native, with 2 child deployments
const MULTI_TOKEN_ON_CHILD_1 = '0x00000000000000000000000000000000000000b2';
const MULTI_TOKEN_ON_CHILD_2 = '0x00000000000000000000000000000000000000b3';
const ERC20_TOKEN = '0x00000000000000000000000000000000000000a3'; // tracked by LZ but not an OFT
const ERC20_TOKEN_ON_CHILD = '0x00000000000000000000000000000000000000b4';
const UNLISTED_TOKEN = '0x00000000000000000000000000000000000000ff';

const metadata = {
  [PARENT_CHAIN_ID]: {
    chainKey: 'parent',
    tokens: {
      [NATIVE_TOKEN]: { isOft: true }, // no peggedTo → native/home token
      [MULTI_TOKEN]: { isOft: true },
      [ERC20_TOKEN]: { isOft: false },
    },
  },
  [CHILD_CHAIN_ID]: {
    chainKey: 'child',
    tokens: {
      [NATIVE_TOKEN_ON_CHILD]: {
        isOft: true,
        peggedTo: { address: NATIVE_TOKEN, chainName: 'parent' },
      },
      [MULTI_TOKEN_ON_CHILD_1]: {
        isOft: true,
        peggedTo: { address: MULTI_TOKEN, chainName: 'parent' },
      },
      [MULTI_TOKEN_ON_CHILD_2]: {
        isOft: true,
        peggedTo: { address: MULTI_TOKEN, chainName: 'parent' },
      },
      [ERC20_TOKEN_ON_CHILD]: {
        isOft: false,
        peggedTo: { address: ERC20_TOKEN, chainName: 'parent' },
      },
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
      ).toEqual({ isOft: false, childTokenAddresses: [], hasOftChildDeployment: false });
    });

    it('finds every child deployment linked to the same native token', () => {
      const { isOft, childTokenAddresses, hasOftChildDeployment } = getLayerZeroOftInfoFromMetadata(
        metadata,
        {
          parentChainId: PARENT_CHAIN_ID,
          parentTokenAddress: MULTI_TOKEN,
          childChainId: CHILD_CHAIN_ID,
        },
      );

      expect(isOft).toBe(true);
      expect(hasOftChildDeployment).toBe(true);
      expect([...childTokenAddresses].sort()).toEqual(
        [MULTI_TOKEN_ON_CHILD_1, MULTI_TOKEN_ON_CHILD_2].sort(),
      );
    });

    it('reports hasOftChildDeployment false when the only child rep is a plain ERC20', () => {
      expect(
        getLayerZeroOftInfoFromMetadata(metadata, {
          parentChainId: PARENT_CHAIN_ID,
          parentTokenAddress: ERC20_TOKEN,
          childChainId: CHILD_CHAIN_ID,
        }),
      ).toEqual({
        isOft: true,
        childTokenAddresses: [ERC20_TOKEN_ON_CHILD],
        hasOftChildDeployment: false,
      });
    });

    it('matches the parent token case-insensitively', () => {
      expect(
        getLayerZeroOftInfoFromMetadata(metadata, {
          parentChainId: PARENT_CHAIN_ID,
          parentTokenAddress: NATIVE_TOKEN.toUpperCase().replace('0X', '0x'),
          childChainId: CHILD_CHAIN_ID,
        }),
      ).toEqual({
        isOft: true,
        childTokenAddresses: [NATIVE_TOKEN_ON_CHILD],
        hasOftChildDeployment: true,
      });
    });

    it('reports OFT with no child deployments when the destination chain is unknown', () => {
      expect(
        getLayerZeroOftInfoFromMetadata(metadata, {
          parentChainId: PARENT_CHAIN_ID,
          parentTokenAddress: NATIVE_TOKEN,
          childChainId: 999999, // not in metadata
        }),
      ).toEqual({ isOft: true, childTokenAddresses: [], hasOftChildDeployment: false });
    });

    it('resolves the native root when the parent token is itself a representation', () => {
      // parent = the child-chain representation, child = the home chain → the root token itself
      expect(
        getLayerZeroOftInfoFromMetadata(metadata, {
          parentChainId: CHILD_CHAIN_ID,
          parentTokenAddress: NATIVE_TOKEN_ON_CHILD,
          childChainId: PARENT_CHAIN_ID,
        }),
      ).toEqual({
        isOft: true,
        childTokenAddresses: [NATIVE_TOKEN],
        hasOftChildDeployment: true,
      });
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
      ).toEqual({ isOft: false, childTokenAddresses: [], hasOftChildDeployment: false });
    });

    it('ignores a chain entry that is missing its chainKey', () => {
      expect(
        getLayerZeroOftInfoFromMetadata(
          { [PARENT_CHAIN_ID]: { tokens: { [NATIVE_TOKEN]: { isOft: true } } } }, // no chainKey
          {
            parentChainId: PARENT_CHAIN_ID,
            parentTokenAddress: NATIVE_TOKEN,
            childChainId: CHILD_CHAIN_ID,
          },
        ),
      ).toEqual({ isOft: false, childTokenAddresses: [], hasOftChildDeployment: false });
    });

    it('skips malformed token entries and incomplete pegged links on the child chain', () => {
      expect(
        getLayerZeroOftInfoFromMetadata(
          {
            [PARENT_CHAIN_ID]: { chainKey: 'parent', tokens: { [NATIVE_TOKEN]: { isOft: true } } },
            [CHILD_CHAIN_ID]: {
              chainKey: 'child',
              tokens: {
                [NATIVE_TOKEN_ON_CHILD]: {
                  isOft: true,
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
      ).toEqual({
        isOft: true,
        childTokenAddresses: [NATIVE_TOKEN_ON_CHILD],
        hasOftChildDeployment: true,
      });
    });
  });
});

describe('isKnownLayerZeroTokenFromMetadata', () => {
  it('returns true for a token LayerZero lists on the chain', () => {
    expect(
      isKnownLayerZeroTokenFromMetadata(metadata, {
        chainId: CHILD_CHAIN_ID,
        tokenAddress: NATIVE_TOKEN_ON_CHILD.toUpperCase().replace('0X', '0x'),
      }),
    ).toBe(true);
  });

  it('returns false for an address LayerZero does not list on the chain', () => {
    expect(
      isKnownLayerZeroTokenFromMetadata(metadata, {
        chainId: CHILD_CHAIN_ID,
        tokenAddress: UNLISTED_TOKEN,
      }),
    ).toBe(false);
  });

  it('returns false when the chain is not in the metadata', () => {
    expect(
      isKnownLayerZeroTokenFromMetadata(metadata, {
        chainId: 999999,
        tokenAddress: NATIVE_TOKEN_ON_CHILD,
      }),
    ).toBe(false);
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

    expect(first).toEqual({ isOft: false, childTokenAddresses: [], hasOftChildDeployment: false }); // null metadata → not found
    expect(second).toEqual({
      isOft: true,
      childTokenAddresses: [NATIVE_TOKEN_ON_CHILD],
      hasOftChildDeployment: true,
    });
    expect(fetchCallCount).toBe(2);
  });
});
