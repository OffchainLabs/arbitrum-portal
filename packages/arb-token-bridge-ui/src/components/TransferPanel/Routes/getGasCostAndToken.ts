import { constants, utils } from 'ethers';

import { RouteCost, Token } from '@/bridge/app/api/crosschain-transfers/types';

import { UseGasSummaryResult } from '../../../hooks/TransferPanel/useGasSummary';
import { NativeCurrency } from '../../../hooks/useNativeCurrency';

const ARBITRUM_BRIDGE_VIA = 'Arbitrum Bridge';
const ARBITRUM_BRIDGE_ICON_URI = '/icons/arbitrum.svg';

export function getGasCostAndToken({
  childChainNativeCurrency,
  parentChainNativeCurrency,
  childChainName,
  parentChainName,
  gasSummaryStatus,
  estimatedChildChainGasFees,
  estimatedParentChainGasFees,
  isDepositMode,
}: {
  childChainNativeCurrency: NativeCurrency;
  parentChainNativeCurrency: NativeCurrency;
  childChainName: string;
  parentChainName: string;
  gasSummaryStatus: UseGasSummaryResult['status'];
  estimatedChildChainGasFees: UseGasSummaryResult['estimatedChildChainGasFees'];
  estimatedParentChainGasFees: UseGasSummaryResult['estimatedParentChainGasFees'];
  isDepositMode: boolean;
}): {
  isLoading: boolean;
  gasCost: RouteCost[] | null;
} {
  const sameNativeCurrency =
    childChainNativeCurrency.isCustom === parentChainNativeCurrency.isCustom;
  const isGasEstimateUnavailable =
    gasSummaryStatus === 'loading' ||
    typeof estimatedChildChainGasFees === 'undefined' ||
    typeof estimatedParentChainGasFees === 'undefined';

  const childChainNativeCurrencyWithAddress: Token =
    'address' in childChainNativeCurrency
      ? childChainNativeCurrency
      : { ...childChainNativeCurrency, address: constants.AddressZero };

  const parentChainNativeCurrencyWithAddress: Token =
    'address' in parentChainNativeCurrency
      ? parentChainNativeCurrency
      : { ...parentChainNativeCurrency, address: constants.AddressZero };

  const getGasCost = ({
    amount,
    token,
    id,
    label,
  }: {
    amount: number;
    token: Token;
    id: string;
    label: string;
  }): RouteCost => ({
    amount: utils.parseUnits(amount.toFixed(token.decimals), token.decimals).toString(),
    token,
    details: {
      id,
      label,
      via: ARBITRUM_BRIDGE_VIA,
      iconURI: ARBITRUM_BRIDGE_ICON_URI,
    },
  });

  if (isGasEstimateUnavailable) {
    return {
      gasCost: null,
      isLoading: true,
    };
  }

  /**
   * Same Native Currencies between Parent and Child chains
   * 1. ETH/ER20 deposit: L1->L2
   * 2. ETH/ERC20 withdrawal: L2->L1
   * 3. ETH/ER20 deposit: L2->L3 (ETH as gas token)
   * 4. ETH/ERC20 withdrawal: L3 (ETH as gas token)->L2
   *
   * x ETH
   */
  if (sameNativeCurrency) {
    const totalGasFees = estimatedParentChainGasFees + estimatedChildChainGasFees;

    return {
      isLoading: false,
      gasCost:
        totalGasFees > 0
          ? [
              getGasCost({
                amount: totalGasFees,
                token: childChainNativeCurrencyWithAddress,
                id: 'arbitrum-gas-total',
                label: `${parentChainName} and ${childChainName} gas fee`,
              }),
            ]
          : [],
    };
  }

  /** Different Native Currencies between Parent and Child chains
   *
   *  Custom gas token deposit: L2->Xai
   *  x ETH
   *
   *  ERC20 deposit: L2->Xai
   *  x ETH and x XAI
   *
   *  Custom gas token/ERC20 withdrawal: L3->L2
   *  only show child chain native currency
   *  x XAI
   */
  if (isDepositMode) {
    const gasCost = [
      getGasCost({
        amount: estimatedParentChainGasFees,
        token: parentChainNativeCurrencyWithAddress,
        id: 'arbitrum-gas-parent',
        label: `${parentChainName} gas fee`,
      }),

      // for custom-native-token deposits that use retryables we will need to add the child gas fee
      getGasCost({
        amount: estimatedChildChainGasFees,
        token: childChainNativeCurrencyWithAddress,
        id: 'arbitrum-gas-child',
        label: `${childChainName} gas fee`,
      }),
    ].filter((_, index) =>
      index === 0 ? estimatedParentChainGasFees > 0 : estimatedChildChainGasFees > 0,
    );

    return {
      gasCost,
      isLoading: false,
    };
  }

  return {
    isLoading: false,
    gasCost:
      estimatedChildChainGasFees > 0
        ? [
            getGasCost({
              amount: estimatedChildChainGasFees,
              token: childChainNativeCurrencyWithAddress,
              id: 'arbitrum-gas-child',
              label: `${childChainName} gas fee`,
            }),
          ]
        : [],
  };
}
