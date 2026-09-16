import { BigNumber } from 'ethers';

import { useTokenBalances } from '../wallet/hooks/useTokenBalances';
import { useWallets } from '../wallet/hooks/useWallets';
import { resolveTokenAddress } from '../wallet/resolveTokenAddress';
import { ERC20BridgeToken } from './arbTokenBridge.types';
import { useArbQueryParams } from './useArbQueryParams';
import { useNativeCurrency } from './useNativeCurrency';
import { useNetworks } from './useNetworks';
import { useNetworksRelationship } from './useNetworksRelationship';

/**
 * Balance of the selected transfer asset on the destination chain.
 *
 * BigNumber is retained at this legacy UI boundary. Balance clients use bigint.
 */
export function useBalanceOnDestinationChain(token: ERC20BridgeToken | null): BigNumber | null {
  const [networks] = useNetworks();
  const { childChain } = useNetworksRelationship(networks);
  const childNativeCurrency = useNativeCurrency({
    chainId: childChain.id,
  });
  const tokenAddress = resolveTokenAddress({
    token,
    side: 'destination',
    sourceChainId: networks.sourceChain.id,
    destinationChainId: networks.destinationChain.id,
    childNativeCurrencyAddress: childNativeCurrency.isCustom
      ? childNativeCurrency.address
      : undefined,
  });

  return useResolvedBalanceOnDestinationChain(tokenAddress);
}

export function useResolvedBalanceOnDestinationChain(
  tokenAddress: string | undefined,
): BigNumber | null {
  const [{ destinationAddress }] = useArbQueryParams();
  const [networks] = useNetworks();
  const { destinationWallet } = useWallets();
  const walletAddress = destinationAddress || destinationWallet.account.address;
  const { data } = useTokenBalances({
    chainId: networks.destinationChain.id,
    walletAddress,
    tokenAddresses: tokenAddress ? [tokenAddress] : [],
  });

  if (!walletAddress || !tokenAddress) {
    return null;
  }

  const balance = data?.[tokenAddress];

  return balance === undefined ? null : BigNumber.from(balance);
}
