import { PlusCircleIcon } from '@heroicons/react/24/outline';
import { utils } from 'ethers';
import React, { ChangeEventHandler, useCallback, useEffect, useMemo } from 'react';
import { create } from 'zustand';

import { getTokenOverride } from '../../../app/api/crosschain-transfers/utils';
import { ETH_BALANCE_ARTICLE_LINK, USDC_LEARN_MORE_LINK } from '../../../constants';
import { useIsBatchTransferSupported } from '../../../hooks/TransferPanel/useIsBatchTransferSupported';
import { useSelectedTokenDecimals } from '../../../hooks/TransferPanel/useSelectedTokenDecimals';
import { useSetInputAmount } from '../../../hooks/TransferPanel/useSetInputAmount';
import { AmountQueryParamEnum, useArbQueryParams } from '../../../hooks/useArbQueryParams';
import { useETHPrice } from '../../../hooks/useETHPrice';
import { useMode } from '../../../hooks/useMode';
import { useNativeCurrency } from '../../../hooks/useNativeCurrency';
import { useNetworks } from '../../../hooks/useNetworks';
import { useNetworksRelationship } from '../../../hooks/useNetworksRelationship';
import { useSelectedToken } from '../../../hooks/useSelectedToken';
import { useSourceChainNativeCurrencyDecimals } from '../../../hooks/useSourceChainNativeCurrencyDecimals';
import { formatUSD } from '../../../util/NumberUtils';
import { getUsdValueForAmount } from '../../../util/TokenPriceUtils';
import { getNetworkName } from '../../../util/networks';
import { Button } from '../../common/Button';
import { DialogWrapper, useDialog2 } from '../../common/Dialog2';
import { ExternalLink } from '../../common/ExternalLink';
import { NetworkButton } from '../../common/NetworkSelectionContainer';
import { LifiSettingsButton } from '../LifiSettingsButton';
import { useTokensFromLists } from '../TokenSearchUtils';
import { NetworkContainer } from '../TransferPanelMain';
import { TransferPanelMainInput } from '../TransferPanelMainInput';
import { useIsCctpTransfer } from '../hooks/useIsCctpTransfer';
import { useIsOftV2Transfer } from '../hooks/useIsOftV2Transfer';
import { useTransferReadiness } from '../useTransferReadiness';
import { useMaxAmount } from './useMaxAmount';
import { useNativeCurrencyBalances } from './useNativeCurrencyBalances';

function Amount2ToggleButton() {
  const [networks] = useNetworks();
  const { childChainProvider } = useNetworksRelationship(networks);
  const nativeCurrency = useNativeCurrency({ provider: childChainProvider });
  const { showAmount2Input } = useAmount2InputVisibility();

  return (
    <Button
      variant="secondary"
      className="border-none bg-black/40 shadow-2"
      onClick={showAmount2Input}
    >
      <div aria-label="Add native currency button" className="flex items-center space-x-1">
        <PlusCircleIcon width={18} />
        <span>Add {nativeCurrency.symbol}</span>
      </div>
    </Button>
  );
}

export const useAmount2InputVisibility = create<{
  isAmount2InputVisible: boolean;
  showAmount2Input: () => void;
}>((set) => ({
  isAmount2InputVisible: false,
  showAmount2Input: () => {
    set(() => ({
      isAmount2InputVisible: true,
    }));
  },
}));

const Input1 = React.memo(() => {
  const [networks] = useNetworks();
  const { childChainProvider } = useNetworksRelationship(networks);
  const sourceNativeCurrency = useNativeCurrency({
    provider: networks.sourceChainProvider,
  });
  const destinationNativeCurrency = useNativeCurrency({ provider: childChainProvider });
  const { ethPrice } = useETHPrice();
  const [{ amount }] = useArbQueryParams();
  const { setAmount } = useSetInputAmount();
  const { maxAmount } = useMaxAmount();
  const decimals = useSelectedTokenDecimals();
  const { errorMessages } = useTransferReadiness();
  const [selectedToken] = useSelectedToken();
  const tokensFromLists = useTokensFromLists();

  const isMaxAmount = amount === AmountQueryParamEnum.MAX;

  // covers MAX string from query params
  useEffect(() => {
    if (isMaxAmount && typeof maxAmount !== 'undefined') {
      setAmount(maxAmount);
    }
  }, [amount, maxAmount, isMaxAmount, setAmount]);

  const maxButtonOnClick = useCallback(() => {
    if (typeof maxAmount !== 'undefined') {
      setAmount(maxAmount);
    }
  }, [maxAmount, setAmount]);

  const handleAmountChange: ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => setAmount(e.target.value),
    [setAmount],
  );

  const overrideOptions = useMemo(() => {
    const override = getTokenOverride({
      fromToken: selectedToken?.address,
      sourceChainId: networks.sourceChain.id,
      destinationChainId: networks.destinationChain.id,
    });

    if (!override.source) {
      return null;
    }

    return {
      ...override.source,
      logoSrc: override.source.logoURI,
    };
  }, [selectedToken?.address, networks.sourceChain.id, networks.destinationChain.id]);

  const usdValue = useMemo(() => {
    const nativeCurrency =
      !selectedToken && destinationNativeCurrency.isCustom
        ? destinationNativeCurrency
        : sourceNativeCurrency;
    const nativeCurrencyPrice = nativeCurrency.isCustom
      ? tokensFromLists[nativeCurrency.address.toLowerCase()]?.priceUSD
      : ethPrice;

    const value = getUsdValueForAmount({
      amount,
      selectedToken,
      nativeCurrency,
      nativeCurrencyPrice,
      tokensFromLists,
    });

    return value ? formatUSD(value) : null;
  }, [
    amount,
    destinationNativeCurrency,
    ethPrice,
    selectedToken,
    sourceNativeCurrency,
    tokensFromLists,
  ]);

  return (
    <TransferPanelMainInput
      maxButtonOnClick={maxButtonOnClick}
      errorMessage={errorMessages?.inputAmount1}
      value={isMaxAmount ? '' : amount}
      usdValue={usdValue}
      onChange={handleAmountChange}
      maxAmount={maxAmount}
      isMaxAmount={isMaxAmount}
      decimals={decimals}
      {...(overrideOptions ? { options: overrideOptions } : {})}
    />
  );
});
Input1.displayName = 'Input1';

const Input2 = React.memo(() => {
  const { showAmount2Input } = useAmount2InputVisibility();

  const [networks] = useNetworks();
  const { childChainProvider } = useNetworksRelationship(networks);
  const nativeCurrency = useNativeCurrency({ provider: childChainProvider });
  const tokensFromLists = useTokensFromLists();
  const { ethPrice } = useETHPrice();
  const [{ amount2 }] = useArbQueryParams();
  const { setAmount2 } = useSetInputAmount();
  const { maxAmount2 } = useMaxAmount();
  const isBatchTransferSupported = useIsBatchTransferSupported();
  const { errorMessages } = useTransferReadiness();

  const isMaxAmount2 = amount2 === AmountQueryParamEnum.MAX;

  useEffect(() => {
    if (isMaxAmount2 && typeof maxAmount2 !== 'undefined') {
      setAmount2(maxAmount2);
    }
  }, [amount2, maxAmount2, isMaxAmount2, setAmount2]);

  useEffect(() => {
    if (isBatchTransferSupported && Number(amount2) > 0) {
      showAmount2Input();
    }
  }, [isBatchTransferSupported, amount2, showAmount2Input]);

  const amount2MaxButtonOnClick = useCallback(() => {
    if (typeof maxAmount2 !== 'undefined') {
      setAmount2(maxAmount2);
    }
  }, [maxAmount2, setAmount2]);

  const handleAmount2Change: ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      setAmount2(e.target.value);
    },
    [setAmount2],
  );
  const nativeCurrencyBalances = useNativeCurrencyBalances();
  const nativeCurrencyDecimalsOnSourceChain = useSourceChainNativeCurrencyDecimals();

  const tokenButtonOptionsAmount2 = useMemo(
    () => ({
      symbol: nativeCurrency.symbol,
      disabled: true,
      balance: nativeCurrencyBalances.sourceBalance
        ? Number(
            utils.formatUnits(
              nativeCurrencyBalances.sourceBalance,
              nativeCurrencyDecimalsOnSourceChain,
            ),
          )
        : undefined,
      logoSrc: null,
    }),
    [
      nativeCurrency.symbol,
      nativeCurrencyBalances.sourceBalance,
      nativeCurrencyDecimalsOnSourceChain,
    ],
  );

  const usdValue = useMemo(() => {
    const nativeCurrencyPrice = nativeCurrency.isCustom
      ? tokensFromLists[nativeCurrency.address.toLowerCase()]?.priceUSD
      : ethPrice;
    const value = getUsdValueForAmount({
      amount: amount2,
      selectedToken: null,
      nativeCurrency,
      nativeCurrencyPrice,
      tokensFromLists,
    });

    return value ? formatUSD(value) : null;
  }, [amount2, ethPrice, nativeCurrency, tokensFromLists]);

  return (
    <TransferPanelMainInput
      maxButtonOnClick={amount2MaxButtonOnClick}
      errorMessage={errorMessages?.inputAmount2}
      value={amount2}
      usdValue={usdValue}
      onChange={handleAmount2Change}
      options={tokenButtonOptionsAmount2}
      maxAmount={maxAmount2}
      isMaxAmount={isMaxAmount2}
      decimals={nativeCurrency.decimals}
      aria-label="Amount2 input"
    />
  );
});
Input2.displayName = 'Input2';

export function SourceNetworkBox() {
  const [networks] = useNetworks();
  const { childChain, childChainProvider, isDepositMode } = useNetworksRelationship(networks);
  const [selectedToken] = useSelectedToken();
  const nativeCurrency = useNativeCurrency({ provider: childChainProvider });
  const [dialogProps, openDialog] = useDialog2();
  const openSourceNetworkSelectionDialog = async () => {
    const waitForInput = openDialog('source_network_selection');
    const [, data] = await waitForInput();
    if (data === 'one_nova_transfer') {
      const waitForNovaInput = openDialog('one_nova_transfer');
      await waitForNovaInput();
      openSourceNetworkSelectionDialog();
    }
  };
  const { isAmount2InputVisible } = useAmount2InputVisibility();
  const isBatchTransferSupported = useIsBatchTransferSupported();
  const isCctpTransfer = useIsCctpTransfer();
  const isOft = useIsOftV2Transfer();
  const { embedMode } = useMode();

  return (
    <>
      <NetworkContainer network={networks.sourceChain}>
        <div className="flex justify-between">
          <NetworkButton type="source" onClick={openSourceNetworkSelectionDialog} />

          {!embedMode && <LifiSettingsButton />}
        </div>

        <div className="flex flex-col gap-1">
          <Input1 />
          {isBatchTransferSupported && !isAmount2InputVisible && (
            <div className="flex justify-end">
              <Amount2ToggleButton />
            </div>
          )}

          {isBatchTransferSupported && isAmount2InputVisible && (
            <>
              <Input2 />
              <p className="mt-1 text-xs font-light text-white">
                You can transfer {nativeCurrency.symbol} in the same transaction if you wish to.
              </p>
            </>
          )}

          {isCctpTransfer && (
            <p className="mt-1 text-xs font-light text-white">
              Bridged USDC (USDC.e) will work but is different from Native USDC.{' '}
              <ExternalLink href={USDC_LEARN_MORE_LINK} className="arb-hover underline">
                Learn more
              </ExternalLink>
              .
            </p>
          )}

          {isDepositMode && selectedToken && !isOft && (
            <p className="mt-1 text-xs font-light text-white">
              Make sure you have {nativeCurrency.symbol} in your {getNetworkName(childChain.id)}{' '}
              account, as you’ll need it to power transactions.
              <br />
              <ExternalLink href={ETH_BALANCE_ARTICLE_LINK} className="arb-hover underline">
                Learn more
              </ExternalLink>
              .
            </p>
          )}
        </div>
      </NetworkContainer>
      <DialogWrapper {...dialogProps} />
    </>
  );
}
