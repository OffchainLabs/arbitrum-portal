import { Chain } from 'wagmi/chains';
import * as chains from 'wagmi/chains';

import { ChainId } from '../types/ChainId';
import { getEnabledLifiOnlyChainIds } from '../util/chainUtils';
import { getChainMetadata } from '../util/networkMetadata';
import { getCustomChainFromLocalStorageById, getSupportedChainIds } from '../util/networks';
import { getOrbitChains, orbitChains } from '../util/orbitChainsList';
import * as customChains from '../util/wagmi/wagmiAdditionalNetworks';
import { chainToWagmiChain } from '../util/wagmi/wagmiAdditionalNetworks';
import { findEcosystemConfig } from '../wallet/ecosystems/getEcosystemConfig';

// Orbit chains use the slug from `orbitChainsData`
type OrbitChainId = ChainId.ApeChain | ChainId.RobinhoodChain | ChainId.RobinhoodChainTestnet;

// Keyed by every other `ChainId`, so a new chain id fails to compile until it has a slug
const coreChains = {
  [ChainId.Solana]: { slug: 'solana', getChain: () => getChainMetadata(ChainId.Solana) },
  [ChainId.Ethereum]: { slug: 'ethereum', getChain: () => chains.mainnet },
  [ChainId.Sepolia]: { slug: 'sepolia', getChain: () => chains.sepolia },
  [ChainId.ArbitrumOne]: { slug: 'arbitrum-one', getChain: () => chains.arbitrum },
  [ChainId.ArbitrumNova]: { slug: 'arbitrum-nova', getChain: () => customChains.arbitrumNova },
  [ChainId.Base]: { slug: 'base', getChain: () => customChains.base },
  [ChainId.ArbitrumSepolia]: {
    slug: 'arbitrum-sepolia',
    getChain: () => customChains.arbitrumSepolia,
  },
  [ChainId.BaseSepolia]: { slug: 'base-sepolia', getChain: () => customChains.baseSepolia },
  [ChainId.Local]: { slug: 'nitro-testnode-l1', getChain: () => customChains.localL1Network },
  [ChainId.ArbitrumLocal]: {
    slug: 'nitro-testnode-l2',
    getChain: () => customChains.localL2Network,
  },
  [ChainId.L3Local]: { slug: 'nitro-testnode-l3', getChain: () => customChains.localL3Network },
} as const satisfies Record<
  Exclude<ChainId, OrbitChainId>,
  { slug: string; getChain: () => Chain }
>;

type CoreChainId = keyof typeof coreChains;
const coreChainList = Object.values(coreChains);

export type ChainKeyQueryParam = (typeof coreChains)[CoreChainId]['slug'];
export type ChainQueryParam = ChainKeyQueryParam | ChainId | number | string;

function isCoreChainId(chainId: number): chainId is CoreChainId {
  return chainId in coreChains;
}

// Chains of other ecosystems are only valid while that ecosystem is enabled
function isEcosystemEnabled(chainId: number): boolean {
  return findEcosystemConfig(chainId)?.isEnabled() ?? true;
}

export function isValidChainQueryParam(value: string | number): boolean {
  if (typeof value === 'string') {
    const coreChain = coreChainList.find((chain) => chain.slug === value);
    if (!coreChain) {
      return getOrbitChains().some((chain) => chain.slug === value);
    }
    return isEcosystemEnabled(coreChain.getChain().id);
  }

  const supportedNetworkIds = getSupportedChainIds({ includeTestnets: true });
  return supportedNetworkIds.includes(value) || getEnabledLifiOnlyChainIds().includes(value);
}

export function getChainQueryParamForChain(chainId: ChainId): ChainQueryParam {
  if (isCoreChainId(chainId)) {
    return coreChains[chainId].slug;
  }

  const customChain = getCustomChainFromLocalStorageById(chainId);
  if (customChain) {
    return customChain.chainId;
  }

  const orbitChain = orbitChains[chainId];
  if (orbitChain) {
    return orbitChain.slug ?? orbitChain.chainId;
  }

  throw new Error(`[getChainQueryParamForChain] Unexpected chain id: ${chainId}`);
}

export function getChainForChainKeyQueryParam(chainKeyQueryParam: ChainKeyQueryParam): Chain {
  const coreChain = coreChainList.find((chain) => chain.slug === chainKeyQueryParam);
  if (coreChain) {
    return coreChain.getChain();
  }

  const orbitChain = getOrbitChains().find((chain) => chain.slug === chainKeyQueryParam);
  if (orbitChain) {
    return chainToWagmiChain(orbitChain);
  }

  throw new Error(
    `[getChainForChainKeyQueryParam] Unexpected chainKeyQueryParam: ${chainKeyQueryParam}`,
  );
}
