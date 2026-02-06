import { BigNumber, constants } from 'ethers';
import { useAccount } from 'wagmi';

import { useNativeCurrencyBalances } from '../components/TransferPanel/TransferPanelMain/useNativeCurrencyBalances';
import { addressesEqual } from '../util/AddressUtils';
import { isTokenArbitrumOneNativeUSDC, isTokenArbitrumSepoliaNativeUSDC } from '../util/TokenUtils';
import { isNetwork } from '../util/networks';
import { ERC20BridgeToken } from './arbTokenBridge.types';
import { useArbQueryParams } from './useArbQueryParams';
import { useBalance } from './useBalance';
import { useNativeCurrency } from './useNativeCurrency';
import { useNetworks } from './useNetworks';
import { useNetworksRelationship } from './useNetworksRelationship';

/**
 * Balance of a token on the destination chain
 */
export function useBalanceOnDestinationChain(token: ERC20BridgeToken | null): BigNumber | null {
  const { address: walletAddress } = useAccount();
  const [{ destinationAddress }] = useArbQueryParams();
  const [networks] = useNetworks();
  const { isDepositMode } = useNetworksRelationship(networks);
  const { isOrbitChain: isDestinationOrbitChain } = isNetwork(networks.destinationChain.id);
  const destinationChainNativeCurrency = useNativeCurrency({
    provider: networks.destinationChainProvider,
  });

  const {
    erc20: [erc20DestinationChainBalances],
    eth: [ethDestinationChainBalance],
  } = useBalance({
    chainId: networks.destinationChain.id,
    walletAddress: destinationAddress || walletAddress,
  });

  const nativeCurrencyBalances = useNativeCurrencyBalances();

  // user selected destination chain native currency
  if (!token) {
    return nativeCurrencyBalances.destinationBalance;
  }

  if (addressesEqual(token.address, constants.AddressZero)) {
    // If ether is the native currency on the destination chain
    if (!destinationChainNativeCurrency.isCustom) {
      return ethDestinationChainBalance;
    }

    return token.l2Address
      ? erc20DestinationChainBalances?.[token.l2Address.toLowerCase()] || constants.Zero
      : constants.Zero;
  }

  const tokenAddressLowercased = token.address.toLowerCase();

  if (!erc20DestinationChainBalances) {
    return constants.Zero;
  }

  // In deposit mode: destination = child chain, use l2Address
  if (isDepositMode) {
    const tokenChildChainAddress = token.l2Address?.toLowerCase();

    // token that has never been deposited so it doesn't have an l2Address
    // this should not happen because user shouldn't be able to select it
    if (!tokenChildChainAddress) {
      return constants.Zero;
    }

    return erc20DestinationChainBalances[tokenChildChainAddress] ?? constants.Zero;
  }

  // In withdrawal mode: destination = parent chain, use parent address
  if (
    isTokenArbitrumOneNativeUSDC(tokenAddressLowercased) ||
    isTokenArbitrumSepoliaNativeUSDC(tokenAddressLowercased)
  ) {
    // because we read parent chain address, make sure we don't read Orbit chain's address if it's the destination chain
    if (!isDestinationOrbitChain) {
      return erc20DestinationChainBalances[tokenAddressLowercased] ?? constants.Zero;
    }
  }

  return erc20DestinationChainBalances[tokenAddressLowercased] ?? constants.Zero;
}
