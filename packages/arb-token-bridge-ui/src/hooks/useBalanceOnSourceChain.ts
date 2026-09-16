import { BigNumber, constants } from 'ethers';

import { addressesEqual } from '../util/AddressUtils';
import { isTokenArbitrumOneNativeUSDC, isTokenArbitrumSepoliaNativeUSDC } from '../util/TokenUtils';
import { isNetwork } from '../util/networks';
import { getNativeTokenAddress } from '../wallet/constants';
import { useTokenBalances } from '../wallet/hooks/useTokenBalances';
import { useWallets } from '../wallet/hooks/useWallets';
import { ERC20BridgeToken } from './arbTokenBridge.types';
import { useNativeCurrency } from './useNativeCurrency';
import { useNetworks } from './useNetworks';
import { useNetworksRelationship } from './useNetworksRelationship';

function getSourceTokenAddress({
  token,
  isDepositMode,
  isSourceOrbitChain,
  isSourceSolana,
  sourceNativeCurrencyIsCustom,
  sourceChainId,
}: {
  token: ERC20BridgeToken | null;
  isDepositMode: boolean;
  isSourceOrbitChain: boolean;
  isSourceSolana: boolean;
  sourceNativeCurrencyIsCustom: boolean;
  sourceChainId: number;
}) {
  if (!token) {
    return getNativeTokenAddress(sourceChainId);
  }

  if (isSourceSolana) {
    return token.address;
  }

  if (addressesEqual(token.address, constants.AddressZero)) {
    return sourceNativeCurrencyIsCustom ? token.l2Address : getNativeTokenAddress(sourceChainId);
  }

  if (isDepositMode) {
    return token.address;
  }

  if (
    !isSourceOrbitChain &&
    (isTokenArbitrumOneNativeUSDC(token.address) || isTokenArbitrumSepoliaNativeUSDC(token.address))
  ) {
    return token.address;
  }

  return token.l2Address;
}

/**
 * Balance of the selected token on the source chain.
 *
 * BigNumber is retained at this legacy UI boundary. Balance providers use bigint.
 */
export function useBalanceOnSourceChain(token: ERC20BridgeToken | null): BigNumber | null {
  const [networks] = useNetworks();
  const { sourceWallet } = useWallets();
  const { isDepositMode } = useNetworksRelationship(networks);
  const { isOrbitChain: isSourceOrbitChain, isSolana: isSourceSolana } = isNetwork(
    networks.sourceChain.id,
  );
  const sourceNativeCurrency = useNativeCurrency({
    provider: networks.sourceChainProvider,
  });
  const tokenAddress = getSourceTokenAddress({
    token,
    isDepositMode,
    isSourceOrbitChain,
    isSourceSolana,
    sourceNativeCurrencyIsCustom: sourceNativeCurrency.isCustom,
    sourceChainId: networks.sourceChain.id,
  });
  const { data } = useTokenBalances({
    chainId: networks.sourceChain.id,
    walletAddress: sourceWallet.account.address,
    tokenAddresses: tokenAddress ? [tokenAddress] : [],
  });

  if (!sourceWallet.account.address || !tokenAddress) {
    return constants.Zero;
  }

  const balance = data?.[tokenAddress];

  return balance === undefined ? null : BigNumber.from(balance);
}
