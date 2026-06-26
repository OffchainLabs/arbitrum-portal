import { beforeEach, describe, expect, it, vi } from 'vitest';

let getLayerZeroNativeTokenStatus: typeof import('./layerZeroMetadata').getLayerZeroNativeTokenStatus;
let getLayerZeroNativeTokenStatusFromMetadata: typeof import('./layerZeroMetadata').getLayerZeroNativeTokenStatusFromMetadata;
let resetLayerZeroMetadataCache: typeof import('./layerZeroMetadata').resetLayerZeroMetadataCache;

describe('getLayerZeroNativeTokenStatus', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    vi.resetModules();

    // Import every export from the same freshly-reset module instance so the
    // module-level cache is consistent across the pure and cached helpers.
    ({
      getLayerZeroNativeTokenStatus,
      getLayerZeroNativeTokenStatusFromMetadata,
      resetLayerZeroMetadataCache,
    } = await import('./layerZeroMetadata'));

    resetLayerZeroMetadataCache();
  });

  it('returns true for a native OFT token on the matching chain', () => {
    expect(
      getLayerZeroNativeTokenStatusFromMetadata(
        {
          ethereum: {
            chainDetails: { nativeChainId: 1 },
            tokens: {
              '0x6c3ea9036406852006290770bedfcaba0e23a0e8': { type: 'NativeOFT' },
            },
          },
        },
        {
          chainId: 1,
          tokenAddress: '0x6C3EA9036406852006290770BEdFcAbA0e23A0e8',
        },
      ),
    ).toBe(true);
  });

  it('returns null for a non-pegged ERC20 that uses an OFT Adapter (defers to on-chain check)', () => {
    expect(
      getLayerZeroNativeTokenStatusFromMetadata(
        {
          ethereum: {
            chainDetails: { nativeChainId: 1 },
            tokens: {
              // e.g. SUSHI — listed in metadata but the token itself is not an
              // OFT, so it must not be classified as a native OFT.
              '0x6b3595068778dd592e39a122f4f5a5cf09c90fe2': {
                type: 'ERC20',
                proxyAddresses: ['0x0000000000000000000000000000000000000001'],
              },
            },
          },
        },
        {
          chainId: 1,
          tokenAddress: '0x6B3595068778DD592e39A122f4f5a5cf09C90fE2',
        },
      ),
    ).toBeNull();
  });

  it('returns false for a non-native OFT representation token', () => {
    expect(
      getLayerZeroNativeTokenStatusFromMetadata(
        {
          arbitrum: {
            chainDetails: { nativeChainId: 42161 },
            tokens: {
              '0x46850ad61c2b7d64d08c9c754f45254596696984': {
                peggedTo: {
                  eid: 30101,
                  address: '0x6c3ea9036406852006290770bedfcaba0e23a0e8',
                },
              },
            },
          },
        },
        {
          chainId: 42161,
          tokenAddress: '0x46850AD61C2b7D64d08C9C754F45254596696984',
        },
      ),
    ).toBe(false);
  });

  it('returns null when the token is not present in metadata', () => {
    expect(
      getLayerZeroNativeTokenStatusFromMetadata(
        {
          ethereum: {
            chainDetails: { nativeChainId: 1 },
            tokens: {},
          },
        },
        {
          chainId: 1,
          tokenAddress: '0x6C3EA9036406852006290770BEdFcAbA0e23A0e8',
        },
      ),
    ).toBeNull();
  });

  it('caches the metadata response', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        ethereum: {
          chainDetails: { nativeChainId: 1 },
          tokens: {
            '0x6c3ea9036406852006290770bedfcaba0e23a0e8': {},
          },
        },
      }),
    } as Response);

    await getLayerZeroNativeTokenStatus({
      chainId: 1,
      tokenAddress: '0x6C3EA9036406852006290770BEdFcAbA0e23A0e8',
    });
    await getLayerZeroNativeTokenStatus({
      chainId: 1,
      tokenAddress: '0x6C3EA9036406852006290770BEdFcAbA0e23A0e8',
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('retries the fetch after a failed response instead of caching the failure', async () => {
    // Local counter rather than the spy's call count, which can carry over
    // from a previous test's `vi.spyOn(globalThis, 'fetch')`.
    let fetchCallCount = 0;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      fetchCallCount += 1;

      if (fetchCallCount === 1) {
        return { ok: false } as Response;
      }

      return {
        ok: true,
        json: async () => ({
          ethereum: {
            chainDetails: { nativeChainId: 1 },
            tokens: {
              '0x6c3ea9036406852006290770bedfcaba0e23a0e8': { type: 'NativeOFT' },
            },
          },
        }),
      } as Response;
    });

    const first = await getLayerZeroNativeTokenStatus({
      chainId: 1,
      tokenAddress: '0x6C3EA9036406852006290770BEdFcAbA0e23A0e8',
    });
    const second = await getLayerZeroNativeTokenStatus({
      chainId: 1,
      tokenAddress: '0x6C3EA9036406852006290770BEdFcAbA0e23A0e8',
    });

    expect(first).toBeNull();
    expect(second).toBe(true);
    expect(fetchCallCount).toBe(2);
  });
});
