import { describe, expect, it } from 'vitest';

import { trimLayerZeroMetadata } from '../app/api/layerzero-metadata';
import { getLayerZeroOftInfoFromMetadata } from './layerZeroMetadata';

// Hits the live LayerZero metadata endpoint (excluded from the unit suite via
// vitest.integration.config.ts). Runs the real trim + parse pipeline against live
// data, guarding against upstream schema/chainKey drift breaking OFT detection.
const LAYERZERO_METADATA_URL = 'https://metadata.layerzero-api.com/v1/metadata';

// Ethena's ENA — a stable, flagship LayerZero OFT (native on Ethereum, OFT on Arbitrum).
const ENA_ETHEREUM = '0x57e114b691db790c35207b2e685d4a43181e6061';
const ENA_ARBITRUM_OFT = '0x58538e6a46e07434d7e7375bc268d3cb839c0133';

async function fetchTrimmedMetadata() {
  const response = await fetch(LAYERZERO_METADATA_URL);
  expect(response.ok).toBe(true);
  return trimLayerZeroMetadata(await response.json());
}

describe('layerZeroMetadata against live LayerZero metadata', () => {
  it('flags a known OFT and returns its real Arbitrum deployment from live metadata', async () => {
    const metadata = await fetchTrimmedMetadata();

    const { isOft, childTokenAddresses } = getLayerZeroOftInfoFromMetadata(metadata, {
      parentChainId: 1, // Ethereum
      parentTokenAddress: ENA_ETHEREUM,
      childChainId: 42161, // Arbitrum One
    });

    expect(isOft).toBe(true);
    expect(childTokenAddresses).toContain(ENA_ARBITRUM_OFT);
    expect(childTokenAddresses.every((address) => /^0x[0-9a-f]{40}$/.test(address))).toBe(true);
  });

  it('reports a non-listed token as not OFT from live metadata', async () => {
    const metadata = await fetchTrimmedMetadata();

    expect(
      getLayerZeroOftInfoFromMetadata(metadata, {
        parentChainId: 1,
        parentTokenAddress: '0x1111111111111111111111111111111111111111',
        childChainId: 42161,
      }),
    ).toEqual({ isOft: false, childTokenAddresses: [] });
  });
});
