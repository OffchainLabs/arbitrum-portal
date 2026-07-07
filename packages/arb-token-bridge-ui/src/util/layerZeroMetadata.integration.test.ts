import { describe, expect, it } from 'vitest';

import { trimLayerZeroMetadata } from '../app/api/layerzero-metadata';
import {
  getLayerZeroOftInfoFromMetadata,
  isKnownLayerZeroTokenFromMetadata,
} from './layerZeroMetadata';

// Hits the live LayerZero metadata endpoint (excluded from the unit suite via
// vitest.integration.config.ts). Runs the real trim + parse pipeline against live
// data, guarding against upstream schema/chainKey drift breaking OFT detection.
const LAYERZERO_METADATA_URL = 'https://metadata.layerzero-api.com/v1/metadata';

// Ethena's ENA — a stable, flagship LayerZero OFT (native on Ethereum, OFT on Arbitrum).
const ENA_ETHEREUM = '0x57e114b691db790c35207b2e685d4a43181e6061';
const ENA_ARBITRUM_OFT = '0x58538e6a46e07434d7e7375bc268d3cb839c0133';

// FRAX — tracked by LayerZero on both chains as a plain ERC20, not an OFT.
const FRAX_ETHEREUM = '0x853d955acef822db058eb8505911ed77f175b99e';

// ARB's real Arbitrum token: LayerZero lists it (so a canonical deposit lands on a
// recognized token), unlike ENA's standard-gateway counterfactual.
const ARB_ON_ARBITRUM = '0x912ce59144191c1204e64559fe8253a0e49e6548';
const ENA_ARBITRUM_CANONICAL = '0xdf8f0c63d9335a0abd89f9f752d293a98ea977d8';

async function fetchTrimmedMetadata() {
  const response = await fetch(LAYERZERO_METADATA_URL);
  expect(response.ok).toBe(true);
  return trimLayerZeroMetadata(await response.json());
}

describe('layerZeroMetadata against live LayerZero metadata', () => {
  it('flags a known OFT and returns its real Arbitrum deployment from live metadata', async () => {
    const metadata = await fetchTrimmedMetadata();

    const { isOft, childTokenAddresses, hasOftChildDeployment } = getLayerZeroOftInfoFromMetadata(
      metadata,
      {
        parentChainId: 1, // Ethereum
        parentTokenAddress: ENA_ETHEREUM,
        childChainId: 42161, // Arbitrum One
      },
    );

    expect(isOft).toBe(true);
    expect(hasOftChildDeployment).toBe(true);
    expect(childTokenAddresses).toContain(ENA_ARBITRUM_OFT);
    expect(childTokenAddresses.every((address) => /^0x[0-9a-f]{40}$/.test(address))).toBe(true);
  });

  it('reports no OFT child deployment for a plain ERC20 (FRAX) from live metadata', async () => {
    const metadata = await fetchTrimmedMetadata();

    const { isOft, hasOftChildDeployment } = getLayerZeroOftInfoFromMetadata(metadata, {
      parentChainId: 1,
      parentTokenAddress: FRAX_ETHEREUM,
      childChainId: 42161,
    });

    // Listed by LayerZero, but with no OFT deployment on Arbitrum, so the caller
    // must not force it off the canonical route.
    expect(isOft).toBe(true);
    expect(hasOftChildDeployment).toBe(false);
  });

  it('recognizes a real listed token but not a gateway counterfactual from live metadata', async () => {
    const metadata = await fetchTrimmedMetadata();

    // ARB's canonical L2 token is listed → a canonical deposit lands on a real token.
    expect(
      isKnownLayerZeroTokenFromMetadata(metadata, {
        chainId: 42161,
        tokenAddress: ARB_ON_ARBITRUM,
      }),
    ).toBe(true);

    // ENA's standard-gateway counterfactual is not a token LayerZero lists.
    expect(
      isKnownLayerZeroTokenFromMetadata(metadata, {
        chainId: 42161,
        tokenAddress: ENA_ARBITRUM_CANONICAL,
      }),
    ).toBe(false);
  });

  it('reports a non-listed token as not OFT from live metadata', async () => {
    const metadata = await fetchTrimmedMetadata();

    expect(
      getLayerZeroOftInfoFromMetadata(metadata, {
        parentChainId: 1,
        parentTokenAddress: '0x1111111111111111111111111111111111111111',
        childChainId: 42161,
      }),
    ).toEqual({ isOft: false, childTokenAddresses: [], hasOftChildDeployment: false });
  });
});
