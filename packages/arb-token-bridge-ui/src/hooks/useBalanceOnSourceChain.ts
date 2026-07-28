import { BigNumber, constants } from 'ethers';
import { useAccount } from 'wagmi';

import { useNativeCurrencyBalances } from '../components/TransferPanel/TransferPanelMain/useNativeCurrencyBalances';
import { addressesEqual } from '../util/AddressUtils';
import { ERC20BridgeToken } from './arbTokenBridge.types';
import { useBalance } from './useBalance';
import { useNativeCurrency } from './useNativeCurrency';
import { useNetworks } from './useNetworks';
import { useNetworksRelationship } from './useNetworksRelationship';

/**
 * Balance of the child chain's native currency or ERC20 token
 */
export function useBalanceOnSourceChain(token: ERC20BridgeToken | null): BigNumber | null {
  const { address: walletAddress } = useAccount();
  const [networks] = useNetworks();
  const { isDepositMode } = useNetworksRelationship(networks);
  const sourceChainNativeCurrency = useNativeCurrency({
    provider: networks.sourceChainProvider,
  });

  const {
    erc20: [erc20SourceChainBalances],
    eth: [ethSourceChainBalance],
  } = useBalance({ chainId: networks.sourceChain.id, walletAddress });

  const nativeCurrencyBalances = useNativeCurrencyBalances();

  // user selected source chain native currency or
  // user bridging the destination chain's native currency
  if (!token) {
    return nativeCurrencyBalances.sourceBalance;
  }

  if (addressesEqual(token.address, constants.AddressZero)) {
    // If ether is the native currency on the source chain
    if (!sourceChainNativeCurrency.isCustom) {
      return ethSourceChainBalance;
    }

    return token.l2Address
      ? erc20SourceChainBalances?.[token.l2Address.toLowerCase()] || constants.Zero
      : constants.Zero;
  }

  const tokenAddressLowercased = token.address.toLowerCase();

  if (!erc20SourceChainBalances) {
    return constants.Zero;
  }

  if (isDepositMode) {
    return erc20SourceChainBalances[tokenAddressLowercased] ?? constants.Zero;
  }

  const tokenChildChainAddress = token.l2Address?.toLowerCase();

  // token that has never been deposited so it doesn't have an l2Address
  // this should not happen because user shouldn't be able to select it
  if (!tokenChildChainAddress) {
    return constants.Zero;
  }

  // token withdrawal
  return erc20SourceChainBalances[tokenChildChainAddress] ?? constants.Zero;
}
