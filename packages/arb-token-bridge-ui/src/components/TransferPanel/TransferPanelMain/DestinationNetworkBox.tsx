import { useMemo } from 'react';
import { useAccount } from 'wagmi';

import { getTokenOverride } from '../../../app/api/crosschain-transfers/utils';
import { useIsBatchTransferSupported } from '../../../hooks/TransferPanel/useIsBatchTransferSupported';
import { useArbQueryParams } from '../../../hooks/useArbQueryParams';
import { useBalanceOnDestinationChain } from '../../../hooks/useBalanceOnDestinationChain';
import { useDestinationToken } from '../../../hooks/useDestinationToken';
import { useETHPrice } from '../../../hooks/useETHPrice';
import { NativeCurrency, useNativeCurrency } from '../../../hooks/useNativeCurrency';
import { useNetworks } from '../../../hooks/useNetworks';
import { useNetworksRelationship } from '../../../hooks/useNetworksRelationship';
import { formatAmount, formatUSD } from '../../../util/NumberUtils';
import { getUsdValueForAmount } from '../../../util/TokenPriceUtils';
import { sanitizeTokenSymbol } from '../../../util/TokenUtils';
import { DialogWrapper, useDialog2 } from '../../common/Dialog2';
import { NetworkButton } from '../../common/NetworkSelectionContainer';
import { Loader } from '../../common/atoms/Loader';
import { DestinationTokenButton } from '../DestinationTokenButton';
import { useTokensFromLists, useTokensFromUser } from '../TokenSearchUtils';
import { NetworkContainer } from '../TransferPanelMain';
import { useReceivedAmount } from '../hooks/useReceivedAmount';
import { useAmount2InputVisibility } from './SourceNetworkBox';
import { useNativeCurrencyBalances } from './useNativeCurrencyBalances';

function BalanceRow({
  parentErc20Address,
  balance,
  symbolOverride,
  tokenInfo,
}: {
  parentErc20Address?: string;
  balance: string | undefined;
  symbolOverride?: string;
  tokenInfo?: NativeCurrency;
}) {
  const [networks] = useNetworks();
  const [{ destinationAddress }] = useArbQueryParams();
  const { isConnected } = useAccount();
  const { childChainProvider, isDepositMode } = useNetworksRelationship(networks);
  const nativeCurrency = useNativeCurrency({ provider: childChainProvider });

  const { data: tokensFromLists } = useTokensFromLists();
  const tokensFromUser = useTokensFromUser();

  const symbol = useMemo(() => {
    if (tokenInfo) {
      return tokenInfo.symbol;
    }

    if (symbolOverride) {
      return symbolOverride;
    }

    if (parentErc20Address) {
      return (
        tokensFromLists[parentErc20Address]?.symbol ?? tokensFromUser[parentErc20Address]?.symbol
      );
    }

    return nativeCurrency.symbol;
  }, [
    tokenInfo,
    symbolOverride,
    nativeCurrency.symbol,
    parentErc20Address,
    tokensFromLists,
    tokensFromUser,
  ]);

  const shouldShowBalance = !isConnected ? !!destinationAddress : true;

  return (
    <div className="flex flex-col items-end gap-[10px] px-[15px] pr-0">
      <DestinationTokenButton tokenInfo={tokenInfo} />
      {shouldShowBalance && (
        <div className="flex space-x-1 text-sm text-gray-6">
          <span>Balance: </span>
          <span
            aria-label={`${symbol} balance amount on ${
              isDepositMode ? 'childChain' : 'parentChain'
            }`}
          >
            {balance ? balance : <Loader wrapperClass="ml-2" size="small" color="white" />}
          </span>
        </div>
      )}
    </div>
  );
}

function BalancesContainer() {
  const [networks] = useNetworks();
  const { childChainProvider } = useNetworksRelationship(networks);
  const destinationToken = useDestinationToken();
  const [{ amount2 }] = useArbQueryParams();
  const destinationNativeCurrency = useNativeCurrency({ provider: childChainProvider });
  const { ethPrice } = useETHPrice();
  const { data: tokensFromLists } = useTokensFromLists();

  const { amount: receivedAmount, amountRaw: receivedAmountRaw, isLoading } = useReceivedAmount();

  const isBatchTransferSupported = useIsBatchTransferSupported();
  const { isAmount2InputVisible } = useAmount2InputVisibility();

  const nativeCurrencyBalances = useNativeCurrencyBalances();
  const destinationBalance = useBalanceOnDestinationChain(destinationToken);

  const tokenOverride = useMemo(() => {
    const override = getTokenOverride({
      fromToken: destinationToken?.address,
      sourceChainId: networks.sourceChain.id,
      destinationChainId: networks.destinationChain.id,
    });
    if (!override) {
      return null;
    }

    return override.destination;
  }, [destinationToken, networks]);

  const isShowingBatchedTransfer = isBatchTransferSupported && isAmount2InputVisible;
  const receivedAmountUsd = useMemo(() => {
    const nativeCurrencyPrice = destinationNativeCurrency.isCustom
      ? tokensFromLists[destinationNativeCurrency.address.toLowerCase()]?.priceUSD
      : ethPrice;
    const value = getUsdValueForAmount({
      amount: receivedAmountRaw,
      selectedToken: destinationToken,
      nativeCurrency: destinationNativeCurrency,
      nativeCurrencyPrice,
      tokensFromLists,
    });

    return value ? formatUSD(value) : null;
  }, [destinationNativeCurrency, destinationToken, ethPrice, receivedAmountRaw, tokensFromLists]);

  const amount2Usd = useMemo(() => {
    const nativeCurrencyPrice = destinationNativeCurrency.isCustom
      ? tokensFromLists[destinationNativeCurrency.address.toLowerCase()]?.priceUSD
      : ethPrice;
    const value = getUsdValueForAmount({
      amount: amount2,
      selectedToken: null,
      nativeCurrency: destinationNativeCurrency,
      nativeCurrencyPrice,
      tokensFromLists,
    });

    return value ? formatUSD(value) : null;
  }, [amount2, destinationNativeCurrency, ethPrice, tokensFromLists]);

  return (
    <div className="flex min-h-[96px] w-full flex-col items-center justify-center gap-2 rounded bg-white/10 p-3 text-white/70">
      <div className="flex h-full w-full flex-row items-center justify-between">
        {isLoading ? (
          <Loader size="small" color="white" />
        ) : (
          <div className="flex max-w-[250px] flex-col gap-1 overflow-clip text-xl sm:max-w-[350px] sm:text-3xl">
            {receivedAmount}
            {receivedAmountUsd && <div className="text-xs text-white/60">{receivedAmountUsd}</div>}
          </div>
        )}
        <div className="flex flex-col gap-1">
          <BalanceRow
            parentErc20Address={destinationToken?.address}
            balance={
              destinationBalance
                ? formatAmount(destinationBalance, {
                    decimals: destinationToken ? destinationToken.decimals : 18,
                  })
                : undefined
            }
            symbolOverride={
              tokenOverride
                ? tokenOverride.symbol
                : destinationToken
                  ? sanitizeTokenSymbol(destinationToken.symbol, {
                      chainId: networks.destinationChain.id,
                      erc20L1Address: destinationToken.address,
                    })
                  : undefined
            }
          />
        </div>
      </div>

      {isShowingBatchedTransfer && (
        <>
          <div className="h-[1px] w-full bg-white/20" />

          <div className="flex w-full flex-row items-center justify-between">
            <div className="flex max-w-[250px] flex-col gap-1 overflow-clip text-xl sm:max-w-[350px] sm:text-3xl">
              {amount2 || '0'}
              {amount2Usd && <div className="text-xs text-white/60">{amount2Usd}</div>}
            </div>

            <BalanceRow
              balance={
                nativeCurrencyBalances.destinationBalance
                  ? formatAmount(nativeCurrencyBalances.destinationBalance)
                  : undefined
              }
              tokenInfo={destinationNativeCurrency}
            />
          </div>
        </>
      )}
    </div>
  );
}

export function DestinationNetworkBox() {
  const [networks] = useNetworks();
  const [{ destinationAddress }] = useArbQueryParams();
  const [dialogProps, openDialog] = useDialog2();
  const openDestinationNetworkSelectionDialog = () => {
    openDialog('destination_network_selection');
  };

  return (
    <>
      <NetworkContainer network={networks.destinationChain} customAddress={destinationAddress}>
        <div className="flex justify-between">
          <NetworkButton type="destination" onClick={openDestinationNetworkSelectionDialog} />
        </div>
        <BalancesContainer />
      </NetworkContainer>
      <DialogWrapper {...dialogProps} />
    </>
  );
}
