import { BigNumber, constants } from 'ethers';
import { useMemo } from 'react';

import { useArbQueryParams } from '../../../hooks/useArbQueryParams';
import { useNativeCurrency } from '../../../hooks/useNativeCurrency';
import { useNetworks } from '../../../hooks/useNetworks';
import { useNetworksRelationship } from '../../../hooks/useNetworksRelationship';
import { getNativeTokenAddress } from '../../../wallet/constants';
import { useTokenBalances } from '../../../wallet/hooks/useTokenBalances';
import { useWallets } from '../../../wallet/hooks/useWallets';

function toBigNumber(balance: bigint | undefined, hasWalletAddress: boolean) {
  if (!hasWalletAddress) {
    return constants.Zero;
  }

  return balance === undefined ? null : BigNumber.from(balance);
}

export function useNativeCurrencyBalances(): {
  sourceBalance: BigNumber | null;
  destinationBalance: BigNumber | null;
} {
  const [networks] = useNetworks();
  const { childChainProvider, isDepositMode } = useNetworksRelationship(networks);
  const [{ destinationAddress }] = useArbQueryParams();
  const { sourceWallet, destinationWallet } = useWallets();
  const nativeCurrency = useNativeCurrency({ provider: childChainProvider });
  const sourceTokenAddress =
    nativeCurrency.isCustom && isDepositMode
      ? nativeCurrency.address
      : getNativeTokenAddress(networks.sourceChain.id);
  const destinationTokenAddress =
    nativeCurrency.isCustom && !isDepositMode
      ? nativeCurrency.address
      : getNativeTokenAddress(networks.destinationChain.id);
  const destinationWalletAddress = destinationAddress || destinationWallet.account.address;
  const { data: sourceBalances } = useTokenBalances({
    chainId: networks.sourceChain.id,
    walletAddress: sourceWallet.account.address,
    tokenAddresses: [sourceTokenAddress],
  });
  const { data: destinationBalances } = useTokenBalances({
    chainId: networks.destinationChain.id,
    walletAddress: destinationWalletAddress,
    tokenAddresses: [destinationTokenAddress],
  });

  return useMemo(
    () => ({
      sourceBalance: toBigNumber(
        sourceBalances?.[sourceTokenAddress],
        Boolean(sourceWallet.account.address),
      ),
      destinationBalance: toBigNumber(
        destinationBalances?.[destinationTokenAddress],
        Boolean(destinationWalletAddress),
      ),
    }),
    [
      destinationBalances,
      destinationTokenAddress,
      destinationWalletAddress,
      sourceBalances,
      sourceTokenAddress,
      sourceWallet.account.address,
    ],
  );
}
