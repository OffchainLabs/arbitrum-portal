import { BigNumber } from 'ethers';
import { useMemo } from 'react';

import { useArbQueryParams } from '../../../hooks/useArbQueryParams';
import { useNativeCurrency } from '../../../hooks/useNativeCurrency';
import { useNetworks } from '../../../hooks/useNetworks';
import { useNetworksRelationship } from '../../../hooks/useNetworksRelationship';
import { getNativeTokenAddress } from '../../../wallet/ecosystems/getEcosystemConfig';
import { useTokenBalances } from '../../../wallet/hooks/useTokenBalances';
import { useWallets } from '../../../wallet/hooks/useWallets';
import { resolveTokenAddress } from '../../../wallet/resolveTokenAddress';

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
  const nativeCurrency = useNativeCurrency({ chainId: childChain.id });
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
  // One token per request, so the keys match the other balance hooks
  const { data: sourceBalances } = useTokenBalances({
    chainId: networks.sourceChain.id,
    walletAddress: sourceWalletAddress,
    tokenAddresses: sourceTokenAddress ? [sourceTokenAddress] : [],
  });
  const { data: sourceGasBalances } = useTokenBalances({
    chainId: networks.sourceChain.id,
    walletAddress: sourceWalletAddress,
    tokenAddresses: [sourceGasTokenAddress],
  });
  const { data: destinationBalances } = useTokenBalances({
    chainId: networks.destinationChain.id,
    walletAddress: destinationWalletAddress,
    tokenAddresses: destinationTokenAddress ? [destinationTokenAddress] : [],
  });
  const { data: destinationGasBalances } = useTokenBalances({
    chainId: networks.destinationChain.id,
    walletAddress: destinationWalletAccountAddress,
    tokenAddresses: [destinationGasTokenAddress],
  });

  return useMemo(() => {
    const toBigNumber = (balance: bigint | undefined) =>
      balance === undefined ? null : BigNumber.from(balance);

    return {
      sourceBalance: toBigNumber(
        sourceTokenAddress ? sourceBalances?.[sourceTokenAddress] : undefined,
      ),
      sourceGasBalance: toBigNumber(sourceGasBalances?.[sourceGasTokenAddress]),
      destinationBalance: toBigNumber(
        destinationTokenAddress ? destinationBalances?.[destinationTokenAddress] : undefined,
      ),
      destinationGasBalance: toBigNumber(destinationGasBalances?.[destinationGasTokenAddress]),
    };
  }, [
    destinationBalances,
    destinationGasBalances,
    destinationGasTokenAddress,
    destinationTokenAddress,
    sourceBalances,
    sourceGasBalances,
    sourceGasTokenAddress,
    sourceTokenAddress,
  ]);
}
