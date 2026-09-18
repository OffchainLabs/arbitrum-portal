import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';

import { ChainId } from '../types/ChainId';
import { getWalletEcosystem } from '../wallet/getWalletEcosystem';
import { isValidAddressForChain } from './AddressUtils';
import {
  getChainMetadata,
  registerCustomChainMetadata,
  removeCustomChainMetadata,
  toChainMetadata,
} from './networkMetadata';
import orbitChainsData from './orbitChainsData.json';

vi.hoisted(() => {
  vi.stubEnv('NEXT_PUBLIC_INFURA_KEY', undefined);
  vi.stubEnv('NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID', undefined);
});

afterAll(() => vi.unstubAllEnvs());

vi.mock('./networks', () => {
  throw new Error('Metadata imported RPC initialization');
});

const customChainId = 987654321;

describe('network metadata', () => {
  afterEach(() => removeCustomChainMetadata(customChainId));

  it('reads both ecosystems without RPC configuration or browser storage', () => {
    expect(process.env.NEXT_PUBLIC_INFURA_KEY).toBeUndefined();
    expect(getChainMetadata(ChainId.Solana).nativeCurrency.symbol).toBe('SOL');
    expect(getChainMetadata(ChainId.ArbitrumOne).nativeCurrency.symbol).toBe('ETH');
    expect(getWalletEcosystem(ChainId.Solana)).toBe('solana');
    expect(getWalletEcosystem(ChainId.ArbitrumOne)).toBe('evm');
  });

  it('keeps configured RPC, explorer, native currency, and testnet metadata', () => {
    const chain = orbitChainsData.mainnet[0];
    if (!chain) throw new Error('Missing bundled network fixture');
    const metadata = toChainMetadata({
      ...chain,
      chainId: customChainId,
      rpcUrl: 'https://rpc.example',
      explorerUrl: 'https://explorer.example',
      isTestnet: true,
      bridgeUiConfig: { nativeTokenData: { name: 'Custom gas', symbol: 'GAS' } },
    });
    expect(metadata).toMatchObject({
      id: customChainId,
      nativeCurrency: { name: 'Custom gas', symbol: 'GAS', decimals: 18 },
      testnet: true,
      rpcUrls: {
        default: { http: ['https://rpc.example'] },
        public: { http: ['https://rpc.example'] },
      },
      blockExplorers: { default: { url: 'https://explorer.example' } },
    });
  });

  it('preserves custom EVM chains registered at the configuration boundary', () => {
    const chain = orbitChainsData.mainnet[0];
    if (!chain) throw new Error('Missing bundled network fixture');
    registerCustomChainMetadata({ ...chain, chainId: customChainId });
    expect(getChainMetadata(customChainId).id).toBe(customChainId);
    expect(getWalletEcosystem(customChainId)).toBe('evm');
    expect(
      isValidAddressForChain('0x1111111111111111111111111111111111111111', customChainId),
    ).toBe(true);
    removeCustomChainMetadata(customChainId);
    expect(() => getWalletEcosystem(customChainId)).toThrow('Unexpected chain id');
    expect(
      isValidAddressForChain('0x1111111111111111111111111111111111111111', customChainId),
    ).toBe(false);
  });
});
