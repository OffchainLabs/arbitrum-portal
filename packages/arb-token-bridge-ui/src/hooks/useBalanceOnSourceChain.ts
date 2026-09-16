import { BigNumber } from 'ethers';

import { getEvmProvider } from '../wallet/getEvmProvider';
import { useTokenBalances } from '../wallet/hooks/useTokenBalances';
import { useWallets } from '../wallet/hooks/useWallets';
import { resolveTokenAddress } from '../wallet/resolveTokenAddress';
import { ERC20BridgeToken } from './arbTokenBridge.types';
import { useNativeCurrency } from './useNativeCurrency';
import { useNetworks } from './useNetworks';
import { useNetworksRelationship } from './useNetworksRelationship';

/**
 * Balance of the selected transfer asset on the source chain.
 *
 * BigNumber is retained at this legacy UI boundary. Balance clients use bigint.
 */
export function useBalanceOnSourceChain(token: ERC20BridgeToken | null): BigNumber | null {
  const [networks] = useNetworks();
  const { sourceWallet } = useWallets();
  const { childChain, childChainProvider } = useNetworksRelationship(networks);
  const childNativeCurrency = useNativeCurrency({
    provider: getEvmProvider(childChain.id, childChainProvider),
  });
  const tokenAddress = resolveTokenAddress({
    token,
    side: 'source',
    sourceChainId: networks.sourceChain.id,
    destinationChainId: networks.destinationChain.id,
    childNativeCurrencyAddress: childNativeCurrency.isCustom
      ? childNativeCurrency.address
      : undefined,
  });
  const { data } = useTokenBalances({
    chainId: networks.sourceChain.id,
    walletAddress: sourceWallet.account.address,
    tokenAddresses: tokenAddress ? [tokenAddress] : [],
  });

  if (!sourceWallet.account.address || !tokenAddress) {
    return null;
  }

  const balance = data?.[tokenAddress];

  return balance === undefined ? null : BigNumber.from(balance);
}
