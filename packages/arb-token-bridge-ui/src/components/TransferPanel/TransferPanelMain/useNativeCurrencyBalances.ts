import { BigNumber, constants } from 'ethers';
import { useMemo } from 'react';

import { useArbQueryParams } from '../../../hooks/useArbQueryParams';
import { useNativeCurrency } from '../../../hooks/useNativeCurrency';
import { useNetworks } from '../../../hooks/useNetworks';
import { useNetworksRelationship } from '../../../hooks/useNetworksRelationship';
import { getNativeTokenAddress } from '../../../wallet/constants';
import { getEvmProvider } from '../../../wallet/getEvmProvider';
import { useTokenBalances } from '../../../wallet/hooks/useTokenBalances';
import { useWallets } from '../../../wallet/hooks/useWallets';
import { resolveTokenAddress } from '../../../wallet/resolveTokenAddress';

function toBigNumber(balance: bigint | undefined, hasWalletAddress: boolean) {
  if (!hasWalletAddress) {
    return constants.Zero;
  }

  return balance === undefined ? null : BigNumber.from(balance);
}

export function useNativeCurrencyBalances(): {
  sourceBalance: BigNumber | null;
  sourceGasBalance: BigNumber | null;
  destinationBalance: BigNumber | null;
  destinationGasBalance: BigNumber | null;
} {
  const [networks] = useNetworks();
  const { childChain, childChainProvider } = useNetworksRelationship(networks);
  const [{ destinationAddress }] = useArbQueryParams();
  const { sourceWallet, destinationWallet } = useWallets();
  const nativeCurrency = useNativeCurrency({
    provider: getEvmProvider(childChain.id, childChainProvider),
  });
  const sourceGasTokenAddress = getNativeTokenAddress(networks.sourceChain.id);
  const destinationGasTokenAddress = getNativeTokenAddress(networks.destinationChain.id);
  const childNativeCurrencyAddress = nativeCurrency.isCustom ? nativeCurrency.address : undefined;
  const sourceTokenAddress = resolveTokenAddress({
    token: null,
    side: 'source',
    sourceChainId: networks.sourceChain.id,
    destinationChainId: networks.destinationChain.id,
    childNativeCurrencyAddress,
  });
  const destinationTokenAddress = resolveTokenAddress({
    token: null,
    side: 'destination',
    sourceChainId: networks.sourceChain.id,
    destinationChainId: networks.destinationChain.id,
    childNativeCurrencyAddress,
  });
  const destinationWalletAddress = destinationAddress || destinationWallet.account.address;
  const { data: sourceBalances } = useTokenBalances({
    chainId: networks.sourceChain.id,
    walletAddress: sourceWallet.account.address,
    tokenAddresses: Array.from(
      new Set(
        [sourceTokenAddress, sourceGasTokenAddress].filter(
          (address): address is string => !!address,
        ),
      ),
    ),
  });
  const { data: destinationBalances } = useTokenBalances({
    chainId: networks.destinationChain.id,
    walletAddress: destinationWalletAddress,
    tokenAddresses: Array.from(
      new Set(
        [destinationTokenAddress, destinationGasTokenAddress].filter(
          (address): address is string => !!address,
        ),
      ),
    ),
  });

  return useMemo(
    () => ({
      sourceBalance: toBigNumber(
        sourceTokenAddress ? sourceBalances?.[sourceTokenAddress] : undefined,
        Boolean(sourceWallet.account.address),
      ),
      sourceGasBalance: toBigNumber(
        sourceBalances?.[sourceGasTokenAddress],
        Boolean(sourceWallet.account.address),
      ),
      destinationBalance: toBigNumber(
        destinationTokenAddress ? destinationBalances?.[destinationTokenAddress] : undefined,
        Boolean(destinationWalletAddress),
      ),
      destinationGasBalance: toBigNumber(
        destinationBalances?.[destinationGasTokenAddress],
        Boolean(destinationWalletAddress),
      ),
    }),
    [
      destinationBalances,
      destinationTokenAddress,
      destinationGasTokenAddress,
      destinationWalletAddress,
      sourceBalances,
      sourceGasTokenAddress,
      sourceTokenAddress,
      sourceWallet.account.address,
    ],
  );
}
