import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getLayerZeroNativeTokenStatusFromMetadata } from './layerZeroMetadata';

let getLayerZeroNativeTokenStatus: typeof import('./layerZeroMetadata').getLayerZeroNativeTokenStatus;
let resetLayerZeroMetadataCache: typeof import('./layerZeroMetadata').resetLayerZeroMetadataCache;

describe('getLayerZeroNativeTokenStatus', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    vi.resetModules();

    ({ getLayerZeroNativeTokenStatus, resetLayerZeroMetadataCache } = await import(
      './layerZeroMetadata'
    ));

    resetLayerZeroMetadataCache();
  });

  it('returns true for a native OFT token on the matching chain', () => {
    expect(
      getLayerZeroNativeTokenStatusFromMetadata(
        {
          ethereum: {
            chainDetails: { nativeChainId: 1 },
            tokens: {
              '0x6c3ea9036406852006290770bedfcaba0e23a0e8': {},
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
});
