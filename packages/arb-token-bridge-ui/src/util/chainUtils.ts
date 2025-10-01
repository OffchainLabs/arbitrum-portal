import { arbitrum, mainnet } from '@wagmi/core/chains';

import { lifiDestinationChainIds } from '../app/api/crosschain-transfers/constants';
import { ChainId } from '../types/ChainId';
import {
  getChainByChainId,
  getChildChainIds,
  getCustomChainsFromLocalStorage,
  isArbitrumChain,
  isNetwork,
  sortChainIds,
} from './networks';
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
    ...getOrbitChains().map((chain) => chain.chainId),
    ...customChainIds,
  ].includes(chainId);
}

export function getDestinationChainIds(
  chainId: ChainId | number,
  {
    includeLifiEnabledChainPairs = false,
    disableTransfersToNonArbitrumChains = false,
  }: {
    includeLifiEnabledChainPairs?: boolean;
    disableTransfersToNonArbitrumChains?: boolean;
  } = {},
): ChainId[] {
  const chain = getChainByChainId(chainId, {
    includeRootChainsWithoutDestination: includeLifiEnabledChainPairs,
  });

  if (!chain) {
    return [];
  }

  const parentChainId = isArbitrumChain(chain) ? chain.parentChainId : undefined;
  const chainIds = getChildChainIds(chain);

  /**
   * Add parent chain if:
   * - parent is an arbitrum network
   * - parent is a non-arbitrum network and transfers to non-arbitrum chains are not disabled
   */
  if (
    parentChainId &&
    (!isNetwork(parentChainId).isNonArbitrumNetwork ||
      (isNetwork(parentChainId).isNonArbitrumNetwork && !disableTransfersToNonArbitrumChains))
  ) {
    chainIds.push(parentChainId);
  }

  /** Include lifi chains, if flag is on */
  const lifiChainIds = lifiDestinationChainIds[chainId];
  if (includeLifiEnabledChainPairs && lifiChainIds && lifiChainIds.length) {
    chainIds.push(...lifiChainIds);
  }

  /** Disabling transfers to non arbitrum chains, remove non-arbitrum chains */
  if (disableTransfersToNonArbitrumChains) {
    return sortChainIds([
      ...new Set(chainIds.filter((chainId) => !isNetwork(chainId).isNonArbitrumNetwork)),
    ]);
  }

  return sortChainIds([...new Set(chainIds)]);
}
