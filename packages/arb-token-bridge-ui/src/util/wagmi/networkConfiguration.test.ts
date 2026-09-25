import { afterEach, describe, expect, it } from 'vitest';

import { ChainId } from '../../types/ChainId';
import { getChainMetadata, removeCustomChainMetadata } from '../networkMetadata';
import {
  getCustomChainsFromLocalStorage,
  mapCustomChainToNetworkData,
  removeCustomChainFromLocalStorage,
  rpcURLs,
  saveCustomChainToLocalStorage,
} from '../networks';
import orbitChainsData from '../orbitChainsData.json';
import { getWagmiChain } from './getWagmiChain';
import { chainToWagmiChain } from './wagmiAdditionalNetworks';

const customChainId = 987654321;

afterEach(() => {
  removeCustomChainFromLocalStorage(customChainId);
});

describe.sequential('wallet configuration over pure metadata', () => {
  it.each([
    ChainId.ArbitrumNova,
    ChainId.Base,
    ChainId.Sepolia,
    ChainId.ArbitrumSepolia,
    ChainId.BaseSepolia,
    ChainId.Local,
    ChainId.ArbitrumLocal,
    ChainId.L3Local,
  ])('retains configured RPC overrides for %s', (chainId) => {
    const walletChain = getWagmiChain(chainId);
    const metadata = getChainMetadata(chainId);
    expect(walletChain).toMatchObject({
      id: metadata.id,
      name: metadata.name,
      nativeCurrency: {
        symbol: metadata.nativeCurrency.symbol,
        decimals: metadata.nativeCurrency.decimals,
      },
    });
    expect(walletChain.rpcUrls.default.http).toEqual([rpcURLs[chainId]]);
  });

  it('retains the wallet Ether labels for Arbitrum and Base testnets', () => {
    for (const chainId of [ChainId.ArbitrumSepolia, ChainId.BaseSepolia]) {
      expect(getWagmiChain(chainId).nativeCurrency.name).toBe('Ether');
      expect(getChainMetadata(chainId).nativeCurrency.name).not.toBe('Ether');
    }
  });

  it('keeps custom chain metadata through saving, reloading, and removal', () => {
    const fixture = orbitChainsData.mainnet[0];
    if (!fixture) throw new Error('Missing network fixture');
    const chain = {
      ...fixture,
      chainId: customChainId,
      isTestnet: true,
      rpcUrl: 'https://custom.example/rpc',
      explorerUrl: 'https://custom.example/explorer',
      nativeTokenData: {
        name: 'Custom gas',
        symbol: 'GAS',
        decimals: 18,
        address: '0x1111111111111111111111111111111111111111',
      },
    };
    saveCustomChainToLocalStorage(chain);
    expect(getChainMetadata(customChainId).testnet).toBe(true);
    expect(getWagmiChain(customChainId).testnet).toBeUndefined();
    expect(getWagmiChain(customChainId).rpcUrls.default.http).toEqual([chain.rpcUrl]);
    removeCustomChainMetadata(customChainId);
    getCustomChainsFromLocalStorage().forEach(mapCustomChainToNetworkData);
    expect(getChainMetadata(customChainId).rpcUrls.default.http).toEqual([chain.rpcUrl]);
    removeCustomChainFromLocalStorage(customChainId);
    expect(() => getChainMetadata(customChainId)).toThrow('Unexpected chain id');
    expect(() => getWagmiChain(customChainId)).toThrow('Unexpected chain id');
  });

  it('preserves local ETH and custom gas token conversion', () => {
    const fixture = orbitChainsData.mainnet[0];
    if (!fixture) throw new Error('Missing network fixture');
    const local = { ...fixture, chainId: ChainId.L3Local };
    expect(chainToWagmiChain({ ...local, nativeToken: undefined }).nativeCurrency.symbol).toBe(
      'ETH',
    );
    expect(
      chainToWagmiChain({ ...local, nativeToken: '0x1111111111111111111111111111111111111111' })
        .nativeCurrency,
    ).toEqual({ name: 'testnode', symbol: 'TN', decimals: 18 });
  });
});
