import { arbitrum, mainnet } from '@wagmi/core/chains';

import { ChainId } from '../types/ChainId';
import { getLifiOnlyEcosystems } from '../wallet/ecosystems';
import { getCustomChainsFromLocalStorage } from './networks';
import { getOrbitChains } from './orbitChainsList';
import {
  localL2Network as arbitrumLocal,
  arbitrumNova,
  arbitrumSepolia,
  base,
  baseSepolia,
  localL3Network as l3Local,
  localL1Network as local,
  sepolia,
} from './wagmi/wagmiAdditionalNetworks';

export function isSupportedChainId(chainId: ChainId | undefined): chainId is ChainId {
  if (!chainId) {
    return false;
  }

  const customChainIds = getCustomChainsFromLocalStorage().map((chain) => chain.chainId);

  return [
    mainnet.id,
    sepolia.id,
    arbitrum.id,
    arbitrumNova.id,
    base.id,
    arbitrumSepolia.id,
    baseSepolia.id,
    arbitrumLocal.id,
    l3Local.id,
    local.id,
    ...getEnabledLifiOnlyChainIds(),
    ...getOrbitChains().map((chain) => chain.chainId),
    ...customChainIds,
  ].includes(chainId);
}

/** Built-in chains of the enabled ecosystems that only reach Arbitrum through LiFi */
export function getEnabledLifiOnlyChainIds(): number[] {
  return getLifiOnlyEcosystems()
    .filter((ecosystem) => ecosystem.isEnabled())
    .flatMap((ecosystem) => ecosystem.chains.map((chain) => chain.id));
}
