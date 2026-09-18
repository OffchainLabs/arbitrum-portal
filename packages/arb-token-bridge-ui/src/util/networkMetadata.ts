import type { Chain } from 'viem';
import {
  arbitrum,
  arbitrumNova,
  arbitrumSepolia,
  base,
  baseSepolia,
  mainnet,
  sepolia,
  superposition,
} from 'viem/chains';

import { ChainId } from '../types/ChainId';
import { solanaChain } from '../wallet/solana/network';
import type { WalletEcosystem } from '../wallet/types';
import type { ChainWithRpcUrl } from './networks';
import orbitChainsData from './orbitChainsData.json';

type NetworkMetadata = {
  chain: Chain;
  ecosystem: WalletEcosystem;
  parentChainId?: number;
  isCustom?: boolean;
};

type ChainMetadataInput = Pick<
  ChainWithRpcUrl,
  'chainId' | 'name' | 'rpcUrl' | 'explorerUrl' | 'isTestnet' | 'nativeTokenData' | 'nativeToken'
> & { bridgeUiConfig?: { nativeTokenData?: { name: string; symbol: string } } };

export function toChainMetadata(chain: ChainMetadataInput): Chain {
  const nativeTokenData = chain.bridgeUiConfig?.nativeTokenData ?? chain.nativeTokenData;
  return {
    id: chain.chainId,
    name: chain.name,
    nativeCurrency:
      chain.chainId === ChainId.L3Local && chain.nativeToken
        ? { name: 'testnode', symbol: 'TN', decimals: 18 }
        : nativeTokenData
          ? { ...nativeTokenData, decimals: 18 }
          : mainnet.nativeCurrency,
    rpcUrls: { default: { http: [chain.rpcUrl] }, public: { http: [chain.rpcUrl] } },
    blockExplorers: { default: { name: 'Block Explorer', url: chain.explorerUrl } },
    testnet: chain.isTestnet,
  };
}

const networks = new Map<number, NetworkMetadata>(
  [mainnet, sepolia, arbitrum, arbitrumNova, arbitrumSepolia, base, baseSepolia].map((chain) => [
    chain.id,
    { chain, ecosystem: 'evm' },
  ]),
);

for (const chain of [...orbitChainsData.mainnet, ...orbitChainsData.testnet]) {
  networks.set(chain.chainId, {
    chain: toChainMetadata(chain),
    ecosystem: 'evm',
    parentChainId: chain.parentChainId,
  });
}

for (const [id, name, rpcUrl] of [
  [ChainId.Local, 'Nitro Testnode L1', 'http://127.0.0.1:8545'],
  [ChainId.ArbitrumLocal, 'Nitro Testnode L2', 'http://127.0.0.1:8547'],
  [ChainId.L3Local, 'Nitro Testnode L3', 'http://127.0.0.1:3347'],
] as const) {
  networks.set(id, {
    ecosystem: 'evm',
    chain: {
      id,
      name,
      nativeCurrency: mainnet.nativeCurrency,
      rpcUrls: { default: { http: [rpcUrl] } },
      testnet: true,
    },
  });
}
networks.set(ChainId.Superposition, {
  chain: superposition,
  ecosystem: 'evm',
  parentChainId: ChainId.ArbitrumOne,
});
networks.set(ChainId.Solana, { chain: solanaChain, ecosystem: 'solana' });

const customNetworks = new Map<number, NetworkMetadata>();

export function registerCustomChainMetadata(chain: ChainWithRpcUrl): void {
  customNetworks.set(chain.chainId, {
    isCustom: true,
    chain: toChainMetadata(chain),
    ecosystem: 'evm',
    parentChainId: chain.parentChainId,
  });
}

export function removeCustomChainMetadata(chainId: number): void {
  customNetworks.delete(chainId);
}

export function getNetworkMetadata(chainId: number): NetworkMetadata {
  const metadata = customNetworks.get(chainId) ?? networks.get(chainId);
  if (!metadata) throw new Error(`[getNetworkMetadata] Unexpected chain id: ${chainId}`);
  return metadata;
}

export function getChainMetadata(chainId: number): Chain {
  return getNetworkMetadata(chainId).chain;
}
