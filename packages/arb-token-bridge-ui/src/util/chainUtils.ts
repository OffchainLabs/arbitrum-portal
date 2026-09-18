import {
  allowedLifiDestinationChainIds,
  allowedLifiSourceChainIds,
  lifiDestinationChainIds,
  lifiSourceOnlyChainIds,
} from '../app/api/crosschain-transfers/constants';
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

export function isSupportedChainId(chainId: ChainId | undefined): chainId is ChainId {
  if (!chainId) {
    return false;
  }

  const customChainIds = getCustomChainsFromLocalStorage().map((chain) => chain.chainId);

  return [
    ...allowedLifiSourceChainIds,
    ...allowedLifiDestinationChainIds,
    ChainId.Ethereum,
    ChainId.Sepolia,
    ChainId.ArbitrumOne,
    ChainId.ArbitrumNova,
    ChainId.Base,
    ChainId.ArbitrumSepolia,
    ChainId.BaseSepolia,
    ChainId.ArbitrumLocal,
    ChainId.L3Local,
    ChainId.Local,
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
  if (lifiSourceOnlyChainIds.has(chainId)) {
    return includeLifiEnabledChainPairs ? [...(lifiDestinationChainIds[chainId] ?? [])] : [];
  }

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

  /** Allow Arbitrum Nova to reach Arbitrum One as destination (one-way only) when LiFi pairs are enabled */
  if (includeLifiEnabledChainPairs && chainId === ChainId.ArbitrumNova) {
    chainIds.push(ChainId.ArbitrumOne);
  }

  /** Disabling transfers to non arbitrum chains, remove non-arbitrum chains */
  if (disableTransfersToNonArbitrumChains) {
    return sortChainIds([
      ...new Set(chainIds.filter((chainId) => !isNetwork(chainId).isNonArbitrumNetwork)),
    ]);
  }

  return sortChainIds([...new Set(chainIds)]);
}
