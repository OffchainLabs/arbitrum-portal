import { getArbitrumNetwork, registerCustomArbitrumNetwork } from '@arbitrum/sdk';
import { Provider } from '@ethersproject/providers';
import { describe, expect, it } from 'vitest';

import { ChainId } from '../../types/ChainId';
import { fetchL2Gateways } from '../fetchL2Gateways';
import { l2UsdcGatewayAddresses } from '../networks';
import { orbitMainnets } from '../orbitChainsList';

const CIRCLE_USDC_GATEWAY = '0xF70ae1Af7D49dA0f7D66Bb55469caC9da336181b';

function providerForChain(chainId: number): Provider {
  return {
    getNetwork: async () => ({ chainId, name: `chain-${chainId}` }),
  } as Provider;
}

function registerOrbitMainnet(chainId: ChainId) {
  const chain = orbitMainnets[chainId];
  if (!chain) {
    throw new Error(`Orbit mainnet ${chainId} is missing from orbitChainsData`);
  }

  try {
    registerCustomArbitrumNetwork(chain);
  } catch {
    // already registered by another concurrent test
  }

  return chain;
}

describe('fetchL2Gateways', () => {
  it('resolves ChainId.HPPMainnet to the HPP orbit chain', () => {
    expect(ChainId.HPPMainnet).toBe(190415);

    const hpp = orbitMainnets[ChainId.HPPMainnet];
    expect(hpp).toBeDefined();
    expect(hpp?.chainId).toBe(ChainId.HPPMainnet);
    expect(hpp?.name).toBe('HPP Mainnet');
  });

  it('returns the Circle USDC gateway for HPP Mainnet', async () => {
    const hpp = registerOrbitMainnet(ChainId.HPPMainnet);

    expect(getArbitrumNetwork(ChainId.HPPMainnet).chainId).toBe(hpp.chainId);
    expect(l2UsdcGatewayAddresses[ChainId.HPPMainnet]).toBe(CIRCLE_USDC_GATEWAY);

    const gateways = await fetchL2Gateways(providerForChain(ChainId.HPPMainnet));
    expect(gateways).toEqual([CIRCLE_USDC_GATEWAY]);
  });

  it('returns the same Circle USDC gateway for Superposition', async () => {
    registerOrbitMainnet(ChainId.Superposition);

    expect(l2UsdcGatewayAddresses[ChainId.Superposition]).toBe(CIRCLE_USDC_GATEWAY);

    const gateways = await fetchL2Gateways(providerForChain(ChainId.Superposition));
    expect(gateways).toContain(CIRCLE_USDC_GATEWAY);
  });
});
