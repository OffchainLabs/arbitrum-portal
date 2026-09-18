import { arbitrum, mainnet } from '@wagmi/core/chains';

import { ChainId } from '../types/ChainId';
import { ecosystems } from '../wallet/ecosystems';
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
    ...(ecosystems.solana.isEnabled() ? [ChainId.Solana] : []),
    ...getOrbitChains().map((chain) => chain.chainId),
    ...customChainIds,
  ].includes(chainId);
}
