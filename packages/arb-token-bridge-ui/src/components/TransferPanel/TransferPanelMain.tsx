import { ArrowDownIcon, ArrowsUpDownIcon } from '@heroicons/react/24/outline';
import { utils } from 'ethers';
import React, { useEffect, useMemo } from 'react';
import { twMerge } from 'tailwind-merge';
import { isAddress } from 'viem';
import { useAccount } from 'wagmi';
import { Chain } from 'wagmi/chains';

import { useUpdateUsdcBalances } from '../../hooks/CCTP/useUpdateUsdcBalances';
import { useAccountType } from '../../hooks/useAccountType';
import { DisabledFeatures, useArbQueryParams } from '../../hooks/useArbQueryParams';
import { useBalances } from '../../hooks/useBalances';
import { useDisabledFeatures } from '../../hooks/useDisabledFeatures';
import { useMode } from '../../hooks/useMode';
import { useNativeCurrency } from '../../hooks/useNativeCurrency';
import { useNetworks } from '../../hooks/useNetworks';
import { useNetworksRelationship } from '../../hooks/useNetworksRelationship';
import { useSelectedToken } from '../../hooks/useSelectedToken';
import { addressesEqual } from '../../util/AddressUtils';
import {
  isTokenArbitrumOneNativeUSDC,
  isTokenArbitrumSepoliaNativeUSDC,
  isTokenMainnetUSDC,
  isTokenSepoliaUSDC,
} from '../../util/TokenUtils';
import { getBridgeUiConfigForChain } from '../../util/bridgeUiConfig';
import { isLifiEnabled } from '../../util/featureFlag';
import { getDestinationChainIds, getExplorerUrl, isNetwork } from '../../util/networks';
import { getOrbitChains } from '../../util/orbitChainsList';
import { Button } from '../common/Button';
import { ExternalLink } from '../common/ExternalLink';
import { CustomMainnetChainWarning } from './CustomMainnetChainWarning';
import { TransferDisabledDialog } from './TransferDisabledDialog';
import { DestinationNetworkBox } from './TransferPanelMain/DestinationNetworkBox';
import { SourceNetworkBox } from './TransferPanelMain/SourceNetworkBox';
import { useUpdateUSDCTokenData } from './TransferPanelMain/hooks';

export function SwitchNetworksButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { accountType, isLoading: isLoadingAccountType } = useAccountType();

  const [{ theme }] = useArbQueryParams();

  const [networks, setNetworks] = useNetworks();

  const { isFeatureDisabled } = useDisabledFeatures();

  const disableTransfersToNonArbitrumChains = isFeatureDisabled(
    DisabledFeatures.TRANSFERS_TO_NON_ARBITRUM_CHAINS,
  );

  const isNetworkSwapBlocked = useMemo(() => {
    // block network swaps in case of either a smart contract wallet, or if the destination chain does not support transfers to the source-chain
    // in this case, we show a one-way arrow and disable the swap button
    return (
      accountType === 'smart-contract-wallet' ||
      !getDestinationChainIds(networks.destinationChain.id, {
        disableTransfersToNonArbitrumChains,
        includeLifiEnabledChainPairs: isLifiEnabled(),
      }).includes(networks.sourceChain.id)
    );
  }, [
    networks.destinationChain.id,
    networks.sourceChain.id,
    accountType,
    disableTransfersToNonArbitrumChains,
  ]);

  const disabled = isLoadingAccountType || isNetworkSwapBlocked;

  return (
    <div className="z-[1] flex h-4 w-full items-center justify-center lg:h-1">
      <Button
        type="button"
        variant="tertiary"
        className={twMerge(
          'group relative flex h-7 w-7 items-center justify-center rounded-full border-[3px] border-gray-1 bg-gray-9 p-1',
          theme.primaryCtaColor ? 'bg-primary-cta' : '',
          disabled && 'pointer-events-none',
        )}
        style={{
          borderRadius: theme.borderRadius,
          borderWidth: theme.borderWidth,
          backgroundColor: theme.primaryCtaColor,
        }}
        onClick={() => {
          // we don't want to add `disabled` property to the button because it will change the button styles, so instead we handle it on click
          if (disabled) {
            return;
          }

          setNetworks({
            sourceChainId: networks.destinationChain.id,
            destinationChainId: networks.sourceChain.id,
          });
        }}
        aria-label="Switch Networks"
        {...props}
      >
        {isNetworkSwapBlocked ? (
          <ArrowDownIcon className="h-4 w-4 stroke-2 text-white" />
        ) : (
          <ArrowsUpDownIcon className="h-4 w-4 stroke-2 text-white transition duration-300 group-hover:rotate-180 group-hover:opacity-80" />
        )}
      </Button>
    </div>
  );
}

function CustomAddressBanner({
  network,
  customAddress,
}: {
  network: Chain;
  customAddress: string | undefined;
}) {
  const { color } = getBridgeUiConfigForChain(network.id);

  if (!customAddress) {
    return null;
  }

  return (
    <div
      style={{
        backgroundColor: `${color}AA`,
        color: 'white',
        borderColor: color,
      }}
      className={twMerge('w-full rounded-t border border-b-0 p-2 text-center text-sm')}
    >
      <span>
        Showing balance for{' '}
        <ExternalLink
          className="arb-hover underline"
          href={`${getExplorerUrl(network.id)}/address/${customAddress}`}
        >
          {customAddress}
        </ExternalLink>
      </span>
    </div>
  );
}

export function NetworkContainer({
  network,
  customAddress,
  children,
}: {
  network: Chain;
  customAddress?: string;
  bgLogoHeight?: number;
  children: React.ReactNode;
}) {
  const { address: walletAddress } = useAccount();
  const [{ theme }] = useArbQueryParams();

  const showCustomAddressBanner = useMemo(() => {
    if (!customAddress) {
      return false;
    }
    if (addressesEqual(customAddress, walletAddress)) {
      return false;
    }
    return utils.isAddress(customAddress);
  }, [customAddress, walletAddress]);

  return (
    <div className="rounded border border-white/10">
      {showCustomAddressBanner && (
        <CustomAddressBanner network={network} customAddress={customAddress} />
      )}
      <div
        className={twMerge(
          'relative rounded bg-white/5 transition-colors duration-400',
          showCustomAddressBanner && 'rounded-t-none',
        )}
        style={{
          backgroundColor: theme.networkThemeOverrideColor,
          borderColor: theme.networkThemeOverrideColor,
        }}
      >
        <div className="absolute left-0 top-0 h-full w-full bg-[-2px_0] bg-no-repeat bg-origin-content p-3 opacity-50" />
        <div className="relative space-y-3.5 bg-contain bg-no-repeat p-3 sm:flex-row">
          {children}
        </div>
      </div>
    </div>
  );
}

export function TransferPanelMain() {
  const [networks] = useNetworks();
  const { parentChain, childChain, childChainProvider, isTeleportMode } =
    useNetworksRelationship(networks);

  const nativeCurrency = useNativeCurrency({ provider: childChainProvider });
  const [selectedToken] = useSelectedToken();

  const { address: walletAddress } = useAccount();

  const [{ destinationAddress }] = useArbQueryParams();
  const { embedMode } = useMode();

  const destinationAddressOrWalletAddress = destinationAddress || walletAddress;

  const { updateErc20ParentBalances, updateErc20ChildBalances } = useBalances();

  const { updateUsdcBalances } = useUpdateUsdcBalances({
    walletAddress:
      destinationAddressOrWalletAddress && isAddress(destinationAddressOrWalletAddress)
        ? destinationAddressOrWalletAddress
        : undefined,
  });

  useEffect(() => {
    if (nativeCurrency.isCustom) {
      updateErc20ParentBalances([nativeCurrency.address]);
    }
  }, [nativeCurrency, updateErc20ParentBalances]);

  useEffect(() => {
    if (
      !selectedToken ||
      !destinationAddressOrWalletAddress ||
      !utils.isAddress(destinationAddressOrWalletAddress)
    ) {
      return;
    }

    if (
      !isTeleportMode &&
      (isTokenMainnetUSDC(selectedToken.address) ||
        isTokenSepoliaUSDC(selectedToken.address) ||
        isTokenArbitrumOneNativeUSDC(selectedToken.address) ||
        isTokenArbitrumSepoliaNativeUSDC(selectedToken.address))
    ) {
      updateUsdcBalances();
      return;
    }

    updateErc20ParentBalances([selectedToken.address]);
    if (selectedToken.l2Address) {
      updateErc20ChildBalances([selectedToken.l2Address]);
    }
  }, [
    selectedToken,
    updateErc20ParentBalances,
    updateErc20ChildBalances,
    destinationAddressOrWalletAddress,
    updateUsdcBalances,
    isTeleportMode,
  ]);

  const isCustomMainnetChain = useMemo(() => {
    const { isTestnet } = isNetwork(parentChain.id);
    const { isCoreChain: isChildCoreChain } = isNetwork(childChain.id);

    if (isTestnet || isChildCoreChain) {
      return false;
    }

    // This will not include custom chains
    return !getOrbitChains().some((_chain) => _chain.chainId === childChain.id);
  }, [parentChain, childChain]);

  useUpdateUSDCTokenData();

  return (
    <div className={twMerge('flex flex-col lg:gap-y-1', embedMode && 'pb-0')}>
      <SourceNetworkBox />

      <SwitchNetworksButton />

      <DestinationNetworkBox />

      {isCustomMainnetChain && <CustomMainnetChainWarning />}

      <TransferDisabledDialog />
    </div>
  );
}
