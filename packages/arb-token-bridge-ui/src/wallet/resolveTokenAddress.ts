import { constants } from 'ethers';

import type { ERC20BridgeToken } from '../hooks/arbTokenBridge.types';
import { ChainId } from '../types/ChainId';
import { addressesEqual } from '../util/AddressUtils';
import { CommonAddress } from '../util/CommonAddressUtils';
import { isTokenArbitrumOneNativeUSDC, isTokenArbitrumSepoliaNativeUSDC } from '../util/TokenUtils';
import { getNetworksRelationship } from '../util/getNetworksRelationship';
import { getNativeTokenAddress } from './constants';

export function resolveTokenAddress({
  token,
  side,
  sourceChainId,
  destinationChainId,
  childNativeCurrencyAddress,
}: {
  token: Pick<ERC20BridgeToken, 'address' | 'l2Address'> | null;
  side: 'source' | 'destination';
  sourceChainId: number;
  destinationChainId: number;
  childNativeCurrencyAddress?: string;
}): string | undefined {
  const { parentChainId, childChainId } = getNetworksRelationship({
    sourceChainId,
    destinationChainId,
  });
  const chainId = side === 'source' ? sourceChainId : destinationChainId;
  const chainRole = chainId === parentChainId ? 'parent' : 'child';
  const chainNativeCurrencyIsCustom = chainId === childChainId && !!childNativeCurrencyAddress;

  if (chainId === ChainId.Solana) {
    return token?.address ?? getNativeTokenAddress(chainId);
  }

  if (!token) {
    return chainRole === 'parent' && childNativeCurrencyAddress
      ? childNativeCurrencyAddress
      : getNativeTokenAddress(chainId);
  }

  if (addressesEqual(token.address, constants.AddressZero)) {
    return chainNativeCurrencyIsCustom ? token.l2Address : getNativeTokenAddress(chainId);
  }

  if (isTokenArbitrumOneNativeUSDC(token.address)) {
    if (chainId === ChainId.Ethereum) return CommonAddress.Ethereum.USDC;
    if (chainId === ChainId.ArbitrumOne) return CommonAddress.ArbitrumOne.USDC;
  }

  if (isTokenArbitrumSepoliaNativeUSDC(token.address)) {
    if (chainId === ChainId.Sepolia) return CommonAddress.Sepolia.USDC;
    if (chainId === ChainId.ArbitrumSepolia) return CommonAddress.ArbitrumSepolia.USDC;
  }

  return chainRole === 'parent' ? token.address : token.l2Address;
}
