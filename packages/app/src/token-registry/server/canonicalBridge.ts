import { type ArbitrumNetwork, getArbitrumNetwork } from '@arbitrum/sdk';

import {
  LIFI_TRANSFER_LIST_ID,
  getBridgeTokenListsForNetworks,
} from '@/bridge/util/TokenListUtils';
import { isTransferDisabledToken } from '@/bridge/util/TokenTransferDisabledUtils';
import { isWithdrawOnlyToken } from '@/bridge/util/WithdrawOnlyUtils';
import { initializeBridgeNetworks } from '@/bridge/util/networks';

import { canonicalBlockExemptions } from '../constants';
import { Address, ChainPair, NATIVE_TOKEN_ADDRESS } from '../types';

export type CanonicalBridge = {
  parentChainId: number;
  childChainId: number;
  parentGatewayRouter: Address;
  tokenListUrls: string[];
};

function findNetwork(chainId: number): ArbitrumNetwork | undefined {
  initializeBridgeNetworks();
  try {
    return getArbitrumNetwork(chainId);
  } catch {
    return undefined;
  }
}

// The LiFi list and the bundled Xai list are not canonical token lists.
function getCanonicalTokenListUrls({
  parentChainId,
  childChainId,
}: {
  parentChainId: number;
  childChainId: number;
}): string[] {
  return getBridgeTokenListsForNetworks({ parentChainId, childChainId })
    .filter((list) => list.id !== LIFI_TRANSFER_LIST_ID && list.url?.startsWith('https://'))
    .flatMap((list) => (list.url ? [list.url] : []));
}

// Custom-gas-token chains need a native token mapping that the PoC does not build yet.
function toCanonicalBridge(network: ArbitrumNetwork): CanonicalBridge | null {
  if (
    !network.tokenBridge ||
    (network.nativeToken && network.nativeToken !== NATIVE_TOKEN_ADDRESS)
  ) {
    return null;
  }

  return {
    parentChainId: network.parentChainId,
    childChainId: network.chainId,
    parentGatewayRouter: network.tokenBridge.parentGatewayRouter.toLowerCase() as Address,
    tokenListUrls: getCanonicalTokenListUrls({
      parentChainId: network.parentChainId,
      childChainId: network.chainId,
    }),
  };
}

export function getCanonicalBridge(pair: ChainPair): CanonicalBridge | null {
  const destination = findNetwork(pair.destinationChainId);
  if (destination?.parentChainId === pair.sourceChainId) {
    return toCanonicalBridge(destination);
  }

  const source = findNetwork(pair.sourceChainId);
  if (source?.parentChainId === pair.destinationChainId) {
    return toCanonicalBridge(source);
  }

  return null;
}

export function isCanonicalDeposit(pair: ChainPair, bridge: CanonicalBridge): boolean {
  return pair.sourceChainId === bridge.parentChainId;
}

// The bridge's policy lists stay the source of truth. The registry applies them on every
// request, so a list change takes effect without invalidating the cache.
export function isCanonicalTransferAllowed({
  bridge,
  pair,
  parentTokenAddress,
}: {
  bridge: CanonicalBridge;
  pair: ChainPair;
  parentTokenAddress: Address;
}): boolean {
  if (
    isTransferDisabledToken(parentTokenAddress, bridge.childChainId) &&
    !canonicalBlockExemptions[bridge.childChainId]?.includes(parentTokenAddress)
  ) {
    return false;
  }
  return !(
    isCanonicalDeposit(pair, bridge) &&
    isWithdrawOnlyToken({
      parentChainErc20Address: parentTokenAddress,
      childChainId: bridge.childChainId,
    })
  );
}
