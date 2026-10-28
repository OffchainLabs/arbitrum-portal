import { describe, expect, it, vi } from 'vitest';

import { ChainId } from '../types/ChainId';
import { trackEvent } from './AnalyticsUtils';
import { isBlockedOftDeposit } from './WithdrawOnlyUtils';

const OFT_TOKEN = '0x1111111111111111111111111111111111111111';
const NON_OFT_TOKEN = '0x2222222222222222222222222222222222222222';

vi.mock('ethers', async (importOriginal) => {
  const actual = await importOriginal<typeof import('ethers')>();
  return {
    ...actual,
    ethers: {
      ...actual.ethers,
      Contract: vi.fn(function (address: string) {
        return {
          oftVersion: () =>
            address === OFT_TOKEN
              ? Promise.resolve(['0x02e49c2c', 1])
              : Promise.reject(new Error('revert')),
        };
      }),
    },
  };
});
vi.mock('@/token-bridge-sdk/utils', () => ({ getProviderForChainId: vi.fn() }));
vi.mock('./AnalyticsUtils', () => ({ trackEvent: vi.fn() }));
vi.mock('./layerZeroMetadata', () => ({
  getLayerZeroMetadata: vi.fn().mockResolvedValue({}),
  getLayerZeroOftInfo: vi
    .fn()
    .mockResolvedValue({ isOft: false, childTokenAddresses: [], hasOftChildDeployment: false }),
  isKnownLayerZeroToken: vi.fn(),
}));

function trackedCallsFor(tokenAddress: string) {
  return vi
    .mocked(trackEvent)
    .mock.calls.filter(
      ([, properties]) =>
        properties && 'tokenAddress' in properties && properties.tokenAddress === tokenAddress,
    );
}

describe('isBlockedOftDeposit on-chain fallback tracking', () => {
  const params = { parentChainId: ChainId.Ethereum, childChainId: ChainId.ArbitrumOne };

  it('tracks once per token when the probe catches an OFT LayerZero does not list', async () => {
    expect(await isBlockedOftDeposit({ ...params, parentChainErc20Address: OFT_TOKEN })).toBe(true);
    expect(await isBlockedOftDeposit({ ...params, parentChainErc20Address: OFT_TOKEN })).toBe(true);

    await vi.waitFor(() => expect(trackedCallsFor(OFT_TOKEN)).toHaveLength(1));
    expect(trackedCallsFor(OFT_TOKEN)[0]).toEqual([
      'OFT Onchain Fallback Block',
      {
        parentChainId: ChainId.Ethereum,
        childChainId: ChainId.ArbitrumOne,
        tokenAddress: OFT_TOKEN,
        isLayerZeroMetadataLoaded: true,
      },
    ]);
  });

  it('does not track when the probe finds no OFT', async () => {
    expect(await isBlockedOftDeposit({ ...params, parentChainErc20Address: NON_OFT_TOKEN })).toBe(
      false,
    );
    expect(trackedCallsFor(NON_OFT_TOKEN)).toHaveLength(0);
  });
});
