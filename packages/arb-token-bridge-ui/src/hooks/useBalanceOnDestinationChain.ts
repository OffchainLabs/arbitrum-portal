import { BigNumber, constants } from 'ethers';

import { addressesEqual } from '../util/AddressUtils';
import { isTokenArbitrumOneNativeUSDC, isTokenArbitrumSepoliaNativeUSDC } from '../util/TokenUtils';
import { isNetwork } from '../util/networks';
import { getNativeTokenAddress } from '../wallet/constants';
import { useTokenBalances } from '../wallet/hooks/useTokenBalances';
import { useWallets } from '../wallet/hooks/useWallets';
import { ERC20BridgeToken } from './arbTokenBridge.types';
import { useArbQueryParams } from './useArbQueryParams';
import { useNativeCurrency } from './useNativeCurrency';
import { useNetworks } from './useNetworks';
import { useNetworksRelationship } from './useNetworksRelationship';

function getDestinationTokenAddress({
  token,
  isDepositMode,
  isDestinationOrbitChain,
  destinationNativeCurrencyIsCustom,
  destinationChainId,
}: {
  token: ERC20BridgeToken | null;
  isDepositMode: boolean;
  isDestinationOrbitChain: boolean;
  destinationNativeCurrencyIsCustom: boolean;
  destinationChainId: number;
}) {
  if (!token) {
    return getNativeTokenAddress(destinationChainId);
  }

  if (addressesEqual(token.address, constants.AddressZero)) {
    return destinationNativeCurrencyIsCustom
      ? token.l2Address
      : getNativeTokenAddress(destinationChainId);
  }

  if (isDepositMode) {
    return token.l2Address;
  }

  if (
    !isDestinationOrbitChain &&
    (isTokenArbitrumOneNativeUSDC(token.address) || isTokenArbitrumSepoliaNativeUSDC(token.address))
  ) {
    return token.address;
  }

  return token.address;
}

/**
 * Balance of the selected token on the destination chain.
 *
 * BigNumber is retained at this legacy UI boundary. Balance providers use bigint.
 */
export function useBalanceOnDestinationChain(token: ERC20BridgeToken | null): BigNumber | null {
  const [{ destinationAddress }] = useArbQueryParams();
  const [networks] = useNetworks();
  const { destinationWallet } = useWallets();
  const { isDepositMode } = useNetworksRelationship(networks);
  const { isOrbitChain: isDestinationOrbitChain } = isNetwork(networks.destinationChain.id);
  const destinationNativeCurrency = useNativeCurrency({
    provider: networks.destinationChainProvider,
  });
  const tokenAddress = getDestinationTokenAddress({
    token,
    isDepositMode,
    isDestinationOrbitChain,
    destinationNativeCurrencyIsCustom: destinationNativeCurrency.isCustom,
    destinationChainId: networks.destinationChain.id,
  });
  const walletAddress = destinationAddress || destinationWallet.account.address;
  const { data } = useTokenBalances({
    chainId: networks.destinationChain.id,
    walletAddress,
    tokenAddresses: tokenAddress ? [tokenAddress] : [],
  });

  if (!walletAddress || !tokenAddress) {
    return constants.Zero;
  }

  const balance = data?.[tokenAddress];

  return balance === undefined ? null : BigNumber.from(balance);
}
