import { BigNumber } from 'ethers';
import { useMemo } from 'react';

import { useArbQueryParams } from '../../../hooks/useArbQueryParams';
import { useNativeCurrency } from '../../../hooks/useNativeCurrency';
import { useNetworks } from '../../../hooks/useNetworks';
import { useNetworksRelationship } from '../../../hooks/useNetworksRelationship';
import type { Address } from '../../../util/AddressUtils';
import { getNativeTokenAddress } from '../../../wallet/constants';
import { useTokenBalances } from '../../../wallet/hooks/useTokenBalances';
import { useWallets } from '../../../wallet/hooks/useWallets';
import { resolveTokenAddress } from '../../../wallet/resolveTokenAddress';

function toBigNumber(balance: bigint | undefined, hasWalletAddress: boolean) {
  if (!hasWalletAddress) {
    return null;
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
  const { childChain } = useNetworksRelationship(networks);
  const [{ destinationAddress }] = useArbQueryParams();
  const {
    sourceWallet: {
      account: { address: sourceWalletAddress },
    },
    destinationWallet: {
      account: { address: destinationWalletAccountAddress },
    },
  } = useWallets();
  const nativeCurrency = useNativeCurrency({
    chainId: childChain.id,
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
  const destinationWalletAddress = destinationAddress || destinationWalletAccountAddress;
  const { data: sourceBalances } = useTokenBalances({
    chainId: networks.sourceChain.id,
    walletAddress: sourceWalletAddress,
    tokenAddresses: Array.from(
      new Set(
        [sourceTokenAddress, sourceGasTokenAddress].filter(
          (address): address is Address => !!address,
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
          (address): address is Address => !!address,
        ),
      ),
    ),
  });
  const { data: destinationGasBalances } = useTokenBalances({
    chainId: networks.destinationChain.id,
    walletAddress: destinationWalletAccountAddress,
    tokenAddresses: [destinationGasTokenAddress],
  });

  return useMemo(
    () => ({
      sourceBalance: toBigNumber(
        sourceTokenAddress ? sourceBalances?.[sourceTokenAddress] : undefined,
        Boolean(sourceWalletAddress),
      ),
      sourceGasBalance: toBigNumber(
        sourceBalances?.[sourceGasTokenAddress],
        Boolean(sourceWalletAddress),
      ),
      destinationBalance: toBigNumber(
        destinationTokenAddress ? destinationBalances?.[destinationTokenAddress] : undefined,
        Boolean(destinationWalletAddress),
      ),
      destinationGasBalance: toBigNumber(
        destinationGasBalances?.[destinationGasTokenAddress],
        Boolean(destinationWalletAccountAddress),
      ),
    }),
    [
      destinationBalances,
      destinationGasBalances,
      destinationWalletAccountAddress,
      destinationTokenAddress,
      destinationGasTokenAddress,
      destinationWalletAddress,
      sourceBalances,
      sourceGasTokenAddress,
      sourceTokenAddress,
      sourceWalletAddress,
    ],
  );
}
