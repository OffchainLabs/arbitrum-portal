import { CheckCircleIcon } from '@heroicons/react/24/outline';
import { BigNumber, constants, utils } from 'ethers';
import { useMemo } from 'react';
import { twMerge } from 'tailwind-merge';

import { useETHPrice } from '@/bridge/hooks/useETHPrice';
import { CommonAddress } from '@/bridge/util/CommonAddressUtils';
import { getUsdValueForAmount } from '@/bridge/util/TokenPriceUtils';

import { getTokenOverride } from '../../app/api/crosschain-transfers/utils';
import { ERC20BridgeToken } from '../../hooks/arbTokenBridge.types';
import { useAccountType } from '../../hooks/useAccountType';
import { useBalanceOnDestinationChain } from '../../hooks/useBalanceOnDestinationChain';
import { useBalanceOnSourceChain } from '../../hooks/useBalanceOnSourceChain';
import { useNativeCurrency } from '../../hooks/useNativeCurrency';
import { useNetworks } from '../../hooks/useNetworks';
import { useNetworksRelationship } from '../../hooks/useNetworksRelationship';
import { useSourceChainNativeCurrencyDecimals } from '../../hooks/useSourceChainNativeCurrencyDecimals';
import { useAppState } from '../../state';
import { ChainId } from '../../types/ChainId';
import { addressesEqual } from '../../util/AddressUtils';
import { formatAmount, formatUSD } from '../../util/NumberUtils';
import { SPECIAL_ARBITRUM_TOKEN_TOKEN_LIST_ID, listIdsToNames } from '../../util/TokenListUtils';
import {
  isTokenArbitrumOneNativeUSDC,
  isTokenArbitrumSepoliaNativeUSDC,
  sanitizeTokenName,
  sanitizeTokenSymbol,
} from '../../util/TokenUtils';
import { getNetworkName } from '../../util/networks';
import { SafeImage } from '../common/SafeImage';
import { StatusBadge } from '../common/StatusBadge';
import { Loader } from '../common/atoms/Loader';
import { TokenLogoFallback } from './TokenInfo';
import { BlockExplorerTokenLink } from './TokenInfoTooltip';
import { useTokensFromLists } from './TokenSearchUtils';

function tokenListIdsToNames(ids: string[]): string {
  return ids.map((tokenListId: string) => listIdsToNames[tokenListId]).join(', ');
}

function StyledLoader() {
  return (
    <div className="mr-2">
      <Loader color="white" size="small" />
    </div>
  );
}

function TokenListInfo({ token }: { token: ERC20BridgeToken | null }) {
  const [networks] = useNetworks();
  const { childChain, childChainProvider } = useNetworksRelationship(networks);
  const { isCustom: childChainNativeCurrencyIsCustom } = useNativeCurrency({
    provider: childChainProvider,
  });
  const sourceChainNativeCurrency = useNativeCurrency({
    provider: networks.sourceChainProvider,
  });
  const destinationChainNativeCurrency = useNativeCurrency({
    provider: networks.destinationChainProvider,
  });

  const tokenListInfo = useMemo(() => {
    if (!token) {
      return null;
    }

    if (isTokenArbitrumOneNativeUSDC(token?.address)) {
      return 'Native USDC on Arbitrum One';
    }

    if (isTokenArbitrumSepoliaNativeUSDC(token?.address)) {
      return 'Native USDC on Arbitrum Sepolia';
    }

    const listIds: Set<string> = token.listIds;
    const listIdsSize = listIds.size;
    if (listIdsSize === 0) {
      return 'Added by User';
    }

    const listIdsArray = Array.from(listIds);
    if (listIdsSize < 2) {
      return tokenListIdsToNames(listIdsArray);
    }

    const firstList = listIdsArray.slice(0, 1);
    const more = listIdsSize - 1;

    return tokenListIdsToNames(firstList) + ` and ${more} more list${more > 1 ? 's' : ''}`;
  }, [token]);

  if (!token) {
    const nativeTokenChain = getNetworkName(
      (childChainNativeCurrencyIsCustom ? childChain : networks.sourceChain).id,
    );
    return <span className="flex text-xs text-white/70">Native token on {nativeTokenChain}</span>;
  }

  if (addressesEqual(token.address, constants.AddressZero)) {
    if (
      (sourceChainNativeCurrency.isCustom && destinationChainNativeCurrency.isCustom) ||
      networks.sourceChain.id === ChainId.ApeChain
    ) {
      return <span className="flex text-xs text-white/70">{tokenListInfo}</span>;
    }

    return (
      <span className="flex text-xs text-white/70">
        Native token on{' '}
        {sourceChainNativeCurrency.isCustom
          ? getNetworkName(networks.destinationChain.id)
          : getNetworkName(networks.sourceChain.id)}
      </span>
    );
  }

  if (token?.isL2Native) {
    return (
      <span className="flex text-xs text-white/70">
        {`This token is native to ${getNetworkName(childChain.id)} and can’t be bridged.`}
      </span>
    );
  }

  return <span className="flex text-xs text-white/70">{tokenListInfo}</span>;
}

interface TokenRowProps {
  style?: React.CSSProperties;
  onTokenSelected: (token: ERC20BridgeToken | null) => void;
  token: ERC20BridgeToken | null;
  isDestination?: boolean;
}

function useTokenInfo(token: ERC20BridgeToken | null, options?: { isDestination: boolean }) {
  const [networks] = useNetworks();
  const { childChain, childChainProvider, parentChain, isDepositMode } =
    useNetworksRelationship(networks);
  const chainId = isDepositMode ? parentChain.id : childChain.id;
  const nativeCurrency = useNativeCurrency({ provider: childChainProvider });
  const overrideToken = useMemo(() => {
    const override = getTokenOverride({
      fromToken: token?.address,
      sourceChainId: networks.sourceChain.id,
      destinationChainId: networks.destinationChain.id,
    });
    if (!override) {
      return null;
    }

    if (options?.isDestination) {
      return override.destination;
    }
    return override.source;
  }, [token, networks, options?.isDestination]);

  const name = useMemo(() => {
    if (overrideToken) {
      return overrideToken.name;
    }
    if (token) {
      return sanitizeTokenName(token.name, {
        erc20L1Address: token.address,
        chainId,
      });
    }

    return nativeCurrency.name;
  }, [overrideToken, token, nativeCurrency.name, chainId]);

  const symbol = useMemo(() => {
    if (overrideToken) {
      return overrideToken.symbol;
    }
    if (token) {
      return sanitizeTokenSymbol(token.symbol, {
        erc20L1Address: token.address,
        chainId,
      });
    }

    return nativeCurrency.symbol;
  }, [overrideToken, token, nativeCurrency.symbol, chainId]);

  const logoURI = useMemo(() => {
    if (overrideToken) {
      return overrideToken.logoURI;
    }
    if (!token) {
      return nativeCurrency.logoUrl;
    }

    return token.logoURI;
  }, [overrideToken, token, nativeCurrency.logoUrl]);

  const sourceBalance = useBalanceOnSourceChain(token);
  const destinationBalance = useBalanceOnDestinationChain(token);
  const balance = options?.isDestination ? destinationBalance : sourceBalance;

  const decimals = useMemo(() => {
    if (overrideToken) {
      return overrideToken.decimals;
    }
    if (!token) {
      return nativeCurrency.decimals;
    }

    return token.decimals;
  }, [overrideToken, token, nativeCurrency.decimals]);

  const isArbitrumToken = useMemo(() => {
    if (!token) {
      return false;
    }

    return token.listIds.has(SPECIAL_ARBITRUM_TOKEN_TOKEN_LIST_ID);
  }, [token]);

  const isBridgeable = useMemo(() => {
    if (!token) {
      return true;
    }

    if (token?.isL2Native) {
      return false;
    }

    if (isDepositMode) {
      return true;
    }

    return typeof token?.l2Address !== 'undefined';
  }, [isDepositMode, token]);

  return {
    name,
    symbol,
    logoURI,
    balance,
    isArbitrumToken,
    isBridgeable,
    decimals,
  };
}

function ArbitrumTokenBadge() {
  return (
    <StatusBadge variant="green" className="text-xs leading-extra-tight">
      <CheckCircleIcon className="h-3 w-3" />
      <p>
        <span>Official</span>
        <span className="hidden lg:inline"> ARB token</span>
      </p>
    </StatusBadge>
  );
}

function TokenBalance({
  token,
  isDestination,
}: {
  token: ERC20BridgeToken | null;
  isDestination: boolean;
}) {
  const [networks] = useNetworks();
  const {
    app: {
      arbTokenBridge: { bridgeTokens },
    },
  } = useAppState();
  const { isLoading: isLoadingAccountType } = useAccountType();
  const { balance, symbol } = useTokenInfo(token, { isDestination });
  const nativeCurrencyOnDestinationChain = useNativeCurrency({
    provider: networks.destinationChainProvider,
  });
  const nativeCurrencyDecimalsOnSourceChain = useSourceChainNativeCurrencyDecimals();
  const nativeCurrencyDecimals = useMemo(() => {
    if (isDestination) {
      return nativeCurrencyOnDestinationChain.decimals;
    }

    return nativeCurrencyDecimalsOnSourceChain;
  }, [
    isDestination,
    nativeCurrencyDecimalsOnSourceChain,
    nativeCurrencyOnDestinationChain.decimals,
  ]);

  const isArbitrumNativeUSDC =
    isTokenArbitrumOneNativeUSDC(token?.address) ||
    isTokenArbitrumSepoliaNativeUSDC(token?.address);

  const tokenIsAddedToTheBridge = useMemo(() => {
    // Can happen when switching networks.
    if (typeof bridgeTokens === 'undefined') {
      return true;
    }

    if (!token || addressesEqual(token.address, constants.AddressZero)) {
      return true;
    }

    if (isArbitrumNativeUSDC) {
      return true;
    }

    return typeof bridgeTokens[token.address] !== 'undefined';
  }, [bridgeTokens, isArbitrumNativeUSDC, token]);

  const decimals = useMemo(() => {
    if (token) {
      return token.decimals;
    }
    return nativeCurrencyDecimals;
  }, [nativeCurrencyDecimals, token]);

  if (!tokenIsAddedToTheBridge) {
    return <span className="arb-hover text-sm">Import</span>;
  }

  // We don't want users to be able to click on USDC before we know whether or not they are SCW users
  if (isLoadingAccountType && isArbitrumNativeUSDC) {
    return <StyledLoader />;
  }

  return (
    <span className="flex items-center whitespace-nowrap text-sm text-white">
      {balance ? (
        formatAmount(balance, {
          decimals,
          symbol,
        })
      ) : (
        <StyledLoader />
      )}
    </span>
  );
}

function TokenContractLink({
  token,
  isDestination = false,
}: {
  token: ERC20BridgeToken | null;
  isDestination?: boolean;
}) {
  const [networks] = useNetworks();
  const { childChain, parentChain, isDepositMode } = useNetworksRelationship(networks);

  const nativeCurrency = useNativeCurrency({ provider: networks.destinationChainProvider });

  const isCustomFeeTokenRow = token === null && nativeCurrency.isCustom;

  if (isDestination) {
    if (isCustomFeeTokenRow) {
      return null;
    }

    if (!token) {
      return null;
    }

    if (addressesEqual(token.address, constants.AddressZero)) {
      return null;
    }

    if (typeof token.l2Address !== 'undefined') {
      return <BlockExplorerTokenLink chainId={childChain.id} address={token.l2Address} />;
    }

    return null;
  }

  if (isCustomFeeTokenRow && isDepositMode) {
    return <BlockExplorerTokenLink chainId={parentChain.id} address={nativeCurrency.address} />;
  }

  if (!token) {
    return null;
  }

  /**
   * Native USDC and bridged USDC share the same L2 address (CommonAddress.ArbitrumOne.USDC), but L1 address is different
   * Bridged USDC has L1 address = CommonAddress.ArbitrumOne.USDC
   * Native USDC has L1 address = CommonAddress.Ethereum.USDC
   */
  if (
    networks.sourceChain.id === ChainId.ArbitrumOne &&
    isTokenArbitrumOneNativeUSDC(token.l2Address) &&
    addressesEqual(token.address, CommonAddress.Ethereum.USDC)
  ) {
    return (
      <BlockExplorerTokenLink
        chainId={networks.sourceChain.id}
        address={CommonAddress.ArbitrumOne['USDC.e']}
      />
    );
  }
  if (
    networks.sourceChain.id === ChainId.ArbitrumSepolia &&
    isTokenArbitrumSepoliaNativeUSDC(token.l2Address) &&
    addressesEqual(token.address, CommonAddress.Sepolia.USDC)
  ) {
    return (
      <BlockExplorerTokenLink
        chainId={networks.sourceChain.id}
        address={CommonAddress.ArbitrumSepolia['USDC.e']}
      />
    );
  }

  if (addressesEqual(token.address, constants.AddressZero)) {
    return null;
  }

  if (isDepositMode) {
    return (
      <BlockExplorerTokenLink
        chainId={token?.isL2Native ? childChain.id : parentChain.id}
        address={token.address}
      />
    );
  }

  if (typeof token.l2Address !== 'undefined') {
    return <BlockExplorerTokenLink chainId={childChain.id} address={token.l2Address} />;
  }
  return (
    <span className="text-xs text-white/70">
      This token hasn&apos;t been bridged to {getNetworkName(childChain.id)}.
    </span>
  );
}

export function TokenRow({
  style,
  onTokenSelected,
  token,
  isDestination = false,
}: TokenRowProps): JSX.Element {
  const {
    name: tokenName,
    symbol: tokenSymbol,
    logoURI: tokenLogoURI,
    isArbitrumToken,
    isBridgeable: tokenIsBridgeable,
    balance,
    decimals,
  } = useTokenInfo(token, { isDestination });
  const [networks] = useNetworks();
  const tokensFromLists = useTokensFromLists();
  const sourceNativeCurrency = useNativeCurrency({ provider: networks.sourceChainProvider });
  const destinationNativeCurrency = useNativeCurrency({
    provider: networks.destinationChainProvider,
  });
  const { ethPrice } = useETHPrice();
  /**
   * - zero address is ETH
   * - null token is Ape (if one of the pair is ApeChain)
   */
  const isZeroAddressToken = !!token && addressesEqual(token.address, constants.AddressZero);
  const apeNativeCurrency =
    networks.sourceChain.id === ChainId.ApeChain ? sourceNativeCurrency : destinationNativeCurrency;
  const ethNativeCurrency =
    networks.sourceChain.id === ChainId.ApeChain ? destinationNativeCurrency : sourceNativeCurrency;
  const nativeCurrencyForUsd = !token ? apeNativeCurrency : ethNativeCurrency;
  const nativeCurrencyPrice = nativeCurrencyForUsd.isCustom
    ? tokensFromLists[nativeCurrencyForUsd.address.toLowerCase()]?.priceUSD
    : ethPrice;

  const priceUSD = getUsdValueForAmount({
    amount: Number(utils.formatUnits(BigNumber.from(balance), decimals)),
    nativeCurrency: nativeCurrencyForUsd,
    nativeCurrencyPrice,
    tokensFromLists,
    selectedToken: isZeroAddressToken ? null : token,
  });
  const hasTokenListInfo = !!token && !addressesEqual(token.address, constants.AddressZero);

  return (
    <button
      type="button"
      onClick={() => onTokenSelected(token)}
      style={{ ...style, minHeight: '84px' }}
      disabled={!tokenIsBridgeable}
      className={twMerge(
        'flex w-full flex-row items-center justify-between px-4 py-3 transition duration-200 hover:bg-white/10',
        tokenIsBridgeable ? 'cursor-pointer opacity-100' : 'cursor-not-allowed opacity-50',
      )}
    >
      <div className="flex w-full flex-row items-center justify-start space-x-4">
        <SafeImage
          src={tokenLogoURI}
          alt={`${tokenName} logo`}
          className="h-6 w-6 shrink-0"
          fallback={<TokenLogoFallback />}
        />

        <div
          className={twMerge(
            'grid grid-cols-[1fr_auto] gap-[4px] w-full',
            hasTokenListInfo ? 'grid-rows-3' : 'grid-rows-2',
          )}
        >
          {/* Row 1: Token name + Balance */}
          <div className="font-medium truncate text-left flex items-center gap-1">
            <span className="text-base font-medium leading-none">{tokenSymbol}</span>
            <span className="text-xs text-white/70">{tokenName}</span>
            <span>{isArbitrumToken && <ArbitrumTokenBadge />}</span>
          </div>
          <div className="ml-auto font-medium tabular-nums">
            {tokenIsBridgeable && <TokenBalance token={token} isDestination={isDestination} />}
          </div>

          {/* Row 2: Contract or token list info + USD value */}
          <div className="text-left flex items-center">
            {!token || addressesEqual(token.address, constants.AddressZero) ? (
              <TokenListInfo token={token} />
            ) : (
              <TokenContractLink token={token} isDestination={isDestination} />
            )}
          </div>
          <div className="ml-auto text-sm text-white/70 tabular-nums">
            {typeof priceUSD === 'number' ? formatUSD(priceUSD) : ''}
          </div>

          {/* Row 3: Token list */}
          {hasTokenListInfo && (
            <div className="col-span-2 text-left">
              <TokenListInfo token={token} />
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
