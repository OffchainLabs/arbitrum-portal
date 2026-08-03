import { BigNumber, constants, utils } from 'ethers';
import { useMemo } from 'react';
import { shallow } from 'zustand/shallow';

import { defaultErc20Decimals } from '../../../defaults';
import { useGasSummary } from '../../../hooks/TransferPanel/useGasSummary';
import { useSelectedTokenBalances } from '../../../hooks/TransferPanel/useSelectedTokenBalances';
import { useNativeCurrency } from '../../../hooks/useNativeCurrency';
import { useNetworks } from '../../../hooks/useNetworks';
import { useNetworksRelationship } from '../../../hooks/useNetworksRelationship';
import { useSelectedToken } from '../../../hooks/useSelectedToken';
import { useSourceChainNativeCurrencyDecimals } from '../../../hooks/useSourceChainNativeCurrencyDecimals';
import { addressesEqual } from '../../../util/AddressUtils';
import { getSelectedRouteContext, useRouteStore } from '../hooks/useRouteStore';
import { useNativeCurrencyBalances } from './useNativeCurrencyBalances';

export function getLifiMaxAmount({
  balance,
  decimals,
  sourceChainId,
  route,
}: {
  balance: BigNumber;
  decimals: number;
  sourceChainId: number;
  route: NonNullable<ReturnType<typeof getSelectedRouteContext>>;
}) {
  const sourceTokenAddress = route.fromAmount.token.address;
  const sumSourceTokenCosts = (costs: typeof route.gas) =>
    costs.reduce(
      (total, cost) =>
        cost.chainId === sourceChainId && addressesEqual(cost.token.address, sourceTokenAddress)
          ? total.add(cost.amount)
          : total,
      constants.Zero,
    );

  const bufferedGasCost = sumSourceTokenCosts(route.gas).mul(14).div(10);
  const feeCost = sumSourceTokenCosts(route.fee);
  const totalCost = bufferedGasCost.add(feeCost);
  const maxAmount = balance.gt(totalCost) ? balance.sub(totalCost) : balance;

  return utils.formatUnits(maxAmount, decimals);
}

export function useMaxAmount() {
  const [selectedToken] = useSelectedToken();
  const selectedTokenBalances = useSelectedTokenBalances();
  const [networks] = useNetworks();
  const { childChainProvider, isDepositMode } = useNetworksRelationship(networks);
  const nativeCurrency = useNativeCurrency({ provider: childChainProvider });
  const nativeCurrencyDecimalsOnSourceChain = useSourceChainNativeCurrencyDecimals();
  const selectedRouteContext = useRouteStore((state) => getSelectedRouteContext(state), shallow);

  const { estimatedParentChainGasFees, estimatedChildChainGasFees } = useGasSummary();

  const nativeCurrencyBalances = useNativeCurrencyBalances();

  const nativeCurrencyMaxAmount = useMemo(() => {
    const nativeCurrencySourceBalance = nativeCurrencyBalances.sourceBalance;

    if (!nativeCurrencySourceBalance) {
      return undefined;
    }

    // ETH deposits and ETH/custom fee token withdrawals
    const nativeCurrencyBalanceFormatted = utils.formatUnits(
      nativeCurrencySourceBalance,
      nativeCurrencyDecimalsOnSourceChain,
    );

    if (selectedRouteContext) {
      return getLifiMaxAmount({
        balance: nativeCurrencySourceBalance,
        decimals: nativeCurrencyDecimalsOnSourceChain,
        sourceChainId: networks.sourceChain.id,
        route: selectedRouteContext,
      });
    }

    if (nativeCurrency.isCustom && isDepositMode) {
      // for custom fee native token deposits, we will need to subtract the child gas fee from source-balance
      return String(
        parseFloat(nativeCurrencyBalanceFormatted) - (estimatedChildChainGasFees ?? 0) * 1.4,
      );
    }

    if (
      nativeCurrency.isCustom &&
      !isDepositMode &&
      (typeof estimatedParentChainGasFees === 'undefined' ||
        typeof estimatedChildChainGasFees === 'undefined')
    ) {
      return nativeCurrencyBalanceFormatted;
    }

    if (
      typeof estimatedParentChainGasFees === 'undefined' ||
      typeof estimatedChildChainGasFees === 'undefined'
    ) {
      return undefined;
    }

    const estimatedTotalGasFees = estimatedParentChainGasFees + estimatedChildChainGasFees;

    const maxAmount = parseFloat(nativeCurrencyBalanceFormatted) - estimatedTotalGasFees * 1.4;

    // make sure it's always a positive number
    // if it's negative, set it to user's balance to show insufficient for gas error
    if (maxAmount > 0) {
      return String(maxAmount);
    }

    return nativeCurrencyBalanceFormatted;
  }, [
    estimatedChildChainGasFees,
    estimatedParentChainGasFees,
    isDepositMode,
    nativeCurrency.isCustom,
    nativeCurrencyBalances.sourceBalance,
    nativeCurrencyDecimalsOnSourceChain,
    networks.sourceChain.id,
    selectedRouteContext,
  ]);

  const maxAmount = useMemo(() => {
    if (selectedToken) {
      const tokenBalance = selectedTokenBalances.sourceBalance;

      if (!tokenBalance) {
        return undefined;
      }

      // For token deposits and withdrawals, we can set the max amount, as gas fees are paid in ETH / custom fee token
      return utils.formatUnits(tokenBalance, selectedToken?.decimals ?? defaultErc20Decimals);
    }

    return nativeCurrencyMaxAmount;
  }, [selectedToken, nativeCurrencyMaxAmount, selectedTokenBalances.sourceBalance]);

  const maxAmount2 = useMemo(() => {
    if (!isDepositMode) {
      return undefined;
    }
    if (typeof estimatedChildChainGasFees === 'undefined') {
      return undefined;
    }
    if (typeof nativeCurrencyMaxAmount === 'undefined') {
      return undefined;
    }

    if (nativeCurrency.isCustom) {
      const amount = Number(nativeCurrencyMaxAmount) - estimatedChildChainGasFees * 1.4;

      // make sure it's always a positive number
      // if it's negative, set it to user's balance to show insufficient for gas error
      if (amount > 0) {
        return String(amount);
      }
    }

    return nativeCurrencyMaxAmount;
  }, [isDepositMode, estimatedChildChainGasFees, nativeCurrencyMaxAmount, nativeCurrency.isCustom]);

  return {
    maxAmount,
    maxAmount2,
  };
}
