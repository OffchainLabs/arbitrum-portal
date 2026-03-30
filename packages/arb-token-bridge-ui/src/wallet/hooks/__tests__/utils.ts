import type { StaticJsonRpcProvider } from '@ethersproject/providers';
import type { Chain } from 'wagmi/chains';

import type { UseNetworksState } from '../../../hooks/useNetworks';
import { ChainId } from '../../../types/ChainId';

export function createChain(id: number, name?: string): Chain {
  return { id, name: name ?? String(id) } as Chain;
}

export function createNetworksState({
  sourceChainId,
  destinationChainId = ChainId.ArbitrumOne,
  sourceChainName,
  destinationChainName,
}: {
  sourceChainId: number;
  destinationChainId?: number;
  sourceChainName?: string;
  destinationChainName?: string;
}): UseNetworksState {
  return {
    sourceChain: createChain(sourceChainId, sourceChainName),
    sourceChainProvider: {} as StaticJsonRpcProvider,
    destinationChain: createChain(destinationChainId, destinationChainName),
    destinationChainProvider: {} as StaticJsonRpcProvider,
  };
}
