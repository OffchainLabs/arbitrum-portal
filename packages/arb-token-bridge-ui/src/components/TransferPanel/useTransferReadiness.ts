import { useLocalStorage } from '@uidotdev/usehooks';
import { BigNumber, constants, utils } from 'ethers';
import { useMemo } from 'react';
import { shallow } from 'zustand/shallow';

import type { AmountWithToken, Token } from '../../app/api/crosschain-transfers/types';
import { TOS_LOCALSTORAGE_KEY, ether } from '../../constants';
import { UseGasSummaryResult, useGasSummary } from '../../hooks/TransferPanel/useGasSummary';
import { useAccountType } from '../../hooks/useAccountType';
import { useArbQueryParams } from '../../hooks/useArbQueryParams';
import { useBalanceOnSourceChain } from '../../hooks/useBalanceOnSourceChain';
import { useNativeCurrency } from '../../hooks/useNativeCurrency';
import { useNetworks } from '../../hooks/useNetworks';
import { useNetworksRelationship } from '../../hooks/useNetworksRelationship';
import { useSelectedToken } from '../../hooks/useSelectedToken';
import { isTransferExecutionAvailable } from '../../services/transferExecutionAvailability';
import { addressesEqual, normalizeAddress } from '../../util/AddressUtils';
import {
  getNovaDepositBlockReason,
  getNovaEthDepositCapErrorMessage,
  getNovaEthOnlyDepositErrorMessage,
} from '../../util/NovaUtils';
import { formatAmount } from '../../util/NumberUtils';
import { isTransferDisabledToken } from '../../util/TokenTransferDisabledUtils';
import { getNativeTokenAddress } from '../../wallet/constants';
import { useWallets } from '../../wallet/hooks/useWallets';
import { useAppContextState } from '../App/AppContext';
import { useNativeCurrencyBalances } from './TransferPanelMain/useNativeCurrencyBalances';
import { useAmountBigNumber } from './hooks/useAmountBigNumber';
import { useDestinationAddressError } from './hooks/useDestinationAddressError';
import {
  RouteContext,
  RouteType,
  getSelectedRouteContext,
  isLifiRoute,
  useRouteStore,
} from './hooks/useRouteStore';
import { useRouteEligibility } from './hooks/useRoutesUpdater';
import { useSelectedTokenIsWithdrawOnly } from './hooks/useSelectedTokenIsWithdrawOnly';
import {
  TransferReadinessRichErrorMessage,
  getInsufficientFundsErrorMessage,
  getInsufficientFundsForGasFeesErrorMessage,
  getWithdrawOnlyChainErrorMessage,
} from './useTransferReadinessUtils';

// Add chains IDs that are currently down or disabled
// It will block transfers (both deposits and withdrawals) and display an info box in the transfer panel
export const DISABLED_CHAIN_IDS: number[] = [];

// withdraw-only chains (will also display error message in the transfer panel)
const WITHDRAW_ONLY_CHAIN_IDS: number[] = [];

type ErrorMessages = {
  inputAmount1?: string | TransferReadinessRichErrorMessage;
  inputAmount2?: string | TransferReadinessRichErrorMessage;
};

function sanitizeEstimatedGasFees(
  gasSummary: UseGasSummaryResult,
  options: {
    isSmartContractWallet: boolean;
    isDepositMode: boolean;
    selectedRoute: RouteType | undefined;
  },
) {
  const { estimatedParentChainGasFees, estimatedChildChainGasFees } = gasSummary;

  if (
    typeof estimatedParentChainGasFees === 'undefined' ||
    typeof estimatedChildChainGasFees === 'undefined'
  ) {
    return {
      estimatedL1GasFees: 0,
      estimatedL2GasFees: 0,
    };
  }

  // For smart contract wallets, the relayer pays the gas fees
  if (options.isSmartContractWallet) {
    // For CCTP, the relayer pays for everything
    if (options.selectedRoute === 'cctp') {
      return { estimatedL1GasFees: 0, estimatedL2GasFees: 0 };
    }

    if (options.isDepositMode) {
      // The L2 fee is paid in callvalue and needs to come from the smart contract wallet for retryable cost estimation to succeed
      return {
        estimatedL1GasFees: 0,
        estimatedL2GasFees: estimatedChildChainGasFees,
      };
    }

    return {
      estimatedL1GasFees: 0,
      estimatedL2GasFees: 0,
    };
  }

  return {
    estimatedL1GasFees: estimatedParentChainGasFees,
    estimatedL2GasFees: estimatedChildChainGasFees,
  };
}

function withdrawalDisabled(token: string) {
  return [
    '0x0e192d382a36de7011f795acc4391cd302003606',
    '0x488cc08935458403a0458e45e20c0159c8ab2c92',
    '0x17FC002b466eEc40DaE837Fc4bE5c67993ddBd6F',
    '0x7468a5d8E02245B00E8C0217fCE021C70Bc51305',
  ].some((disabledToken) => addressesEqual(disabledToken, token));
}

function ready() {
  const result: UseTransferReadinessResult = {
    transferReady: { deposit: true, withdrawal: true },
  };

  return result;
}

function notReady(
  params: {
    errorMessages: ErrorMessages | undefined;
  } = {
    errorMessages: undefined,
  },
) {
  const result: UseTransferReadinessResult = {
    transferReady: { deposit: false, withdrawal: false },
  };

  return { ...result, ...params };
}

/**
 * For some transfers (from Ape for example), fees and gas are paid in APE token.
 * While amount itself is paid in the token sent (USDC or ETH).
 */
export function getAmountToPay(selectedRouteContext: RouteContext) {
  const amounts: Record<string, AmountWithToken> = {};
  let fromAmountUsd = 0;

  function addAmount({
    token,
    amount,
    amountUSD,
    chainId,
  }: {
    token: Token;
    amount: string | undefined;
    amountUSD?: string;
    chainId?: number;
  }) {
    const key = `${chainId ?? 'unknown'}:${normalizeAddress(token.address)}`;
    const acc = amounts[key];
    const parsedAmount = BigNumber.from(amount ?? 0);
    const parsedAmountUSD = amountUSD ?? '0';
    fromAmountUsd += Number(parsedAmountUSD);
    if (acc) {
      amounts[key] = {
        amount: BigNumber.from(acc.amount).add(parsedAmount).toString(),
        amountUSD: (Number(acc.amountUSD) + Number(parsedAmountUSD)).toFixed(3),
        token,
        chainId,
      };
    } else {
      amounts[key] = {
        amount: parsedAmount.toString(),
        amountUSD: parsedAmountUSD,
        token,
        chainId,
      };
    }
  }

  selectedRouteContext.fee.forEach(addAmount);
  selectedRouteContext.gas.forEach(addAmount);
  addAmount({
    ...selectedRouteContext.fromAmount,
    chainId: selectedRouteContext.fromChainId,
  });

  return {
    amounts,
    fromAmountUsd: Number(fromAmountUsd.toFixed(3)),
    toAmountUsd: Number(selectedRouteContext.toAmount.amountUSD),
  };
}

function formatAmountToPay(amountToPay: AmountWithToken | undefined) {
  return parseFloat(
    utils.formatUnits(amountToPay?.amount || constants.Zero, amountToPay?.token.decimals || 18),
  );
}

function getInsufficientNativeBalanceErrorMessage({
  amountToPay,
  balance,
  nativeCurrencySymbol,
  chainName,
}: {
  amountToPay: number;
  balance: number | null;
  nativeCurrencySymbol: string;
  chainName: string;
}) {
  if (balance === null || amountToPay <= balance) {
    return undefined;
  }

  return getInsufficientFundsForGasFeesErrorMessage({
    asset: nativeCurrencySymbol,
    chain: chainName,
    balance: formatAmount(balance),
    requiredBalance: formatAmount(amountToPay),
  });
}

export type UseTransferReadinessTransferReady = {
  deposit: boolean;
  withdrawal: boolean;
};

export type UseTransferReadinessResult = {
  transferReady: UseTransferReadinessTransferReady;
  errorMessages?: ErrorMessages;
};

export function useTransferReadiness(): UseTransferReadinessResult {
  const [{ amount, amount2, destinationToken }] = useArbQueryParams();
  const [selectedToken] = useSelectedToken();
  const amountBigNumber = useAmountBigNumber();
  const {
    layout: { isTransferring },
  } = useAppContextState();
  const [networks] = useNetworks();
  const { sourceWallet } = useWallets();
  const executionAvailable = isTransferExecutionAvailable({
    chainId: networks.sourceChain.id,
    wallet: sourceWallet,
  });
  const { childChain, isDepositMode } = useNetworksRelationship(networks);
  const { selectedRoute, selectedRouteContext } = useRouteStore(
    (state) => ({
      selectedRoute: state.selectedRoute,
      selectedRouteContext: getSelectedRouteContext(state),
    }),
    shallow,
  );
  const { eligibleRouteTypes } = useRouteEligibility();

  const { isSelectedTokenWithdrawOnly, isSelectedTokenWithdrawOnlyLoading } =
    useSelectedTokenIsWithdrawOnly();
  const gasSummary = useGasSummary();
  const { accountType } = useAccountType();
  const isSmartContractWallet = accountType === 'smart-contract-wallet';
  const nativeCurrency = useNativeCurrency({ chainId: childChain.id });
  const {
    sourceBalance: sourceNativeBalance,
    sourceGasBalance,
    destinationGasBalance,
  } = useNativeCurrencyBalances();
  const selectedTokenSourceBalance = useBalanceOnSourceChain(selectedToken);
  const { destinationAddressError } = useDestinationAddressError();
  const [tosAccepted] = useLocalStorage<boolean>(TOS_LOCALSTORAGE_KEY);

  const sourceNativeBalanceFloat = sourceNativeBalance
    ? parseFloat(
        utils.formatUnits(sourceNativeBalance, networks.sourceChain.nativeCurrency.decimals),
      )
    : null;
  const sourceGasBalanceFloat = sourceGasBalance
    ? parseFloat(utils.formatUnits(sourceGasBalance, networks.sourceChain.nativeCurrency.decimals))
    : null;
  const destinationGasBalanceFloat = destinationGasBalance
    ? parseFloat(
        utils.formatUnits(destinationGasBalance, networks.destinationChain.nativeCurrency.decimals),
      )
    : null;
  const selectedTokenSourceBalanceFloat =
    selectedToken && selectedTokenSourceBalance
      ? parseFloat(utils.formatUnits(selectedTokenSourceBalance, selectedToken.decimals))
      : null;

  const customFeeTokenL1BalanceFloat =
    nativeCurrency.isCustom && isDepositMode ? sourceNativeBalanceFloat : null;

  return useMemo(() => {
    const { estimatedL1GasFees, estimatedL2GasFees } = sanitizeEstimatedGasFees(gasSummary, {
      selectedRoute,
      isSmartContractWallet,
      isDepositMode,
    });

    /**
     * Nova is in a minimized state: deposits are ETH-only and capped. This has to run before the
     * `selectedRoute` and balance-loading checks below, otherwise the message is unreachable
     * (`getEligibleRoutes` returns no routes while the amount is still 0).
     */
    const novaDepositBlockReason = getNovaDepositBlockReason({
      destinationChainId: networks.destinationChain.id,
      selectedTokenAddress: selectedToken?.address,
      destinationTokenAddress: destinationToken,
      amount: amountBigNumber,
    });

    if (novaDepositBlockReason) {
      return notReady({
        errorMessages: {
          inputAmount1:
            novaDepositBlockReason === 'eth-only'
              ? getNovaEthOnlyDepositErrorMessage()
              : getNovaEthDepositCapErrorMessage(),
        },
      });
    }

    if (!executionAvailable) {
      return notReady();
    }

    if (!selectedRoute) {
      return notReady();
    }

    const eligibleSelectedRoute = isLifiRoute(selectedRoute) ? 'lifi' : selectedRoute;
    if (!eligibleRouteTypes.includes(eligibleSelectedRoute)) {
      return notReady();
    }

    const ethBalanceFloat = sourceGasBalanceFloat;
    const selectedTokenBalanceFloat = selectedTokenSourceBalanceFloat;
    const isCustomFeeToken = nativeCurrency.isCustom && !isLifiRoute(selectedRoute);
    const customFeeTokenBalanceFloat = isCustomFeeToken
      ? isDepositMode
        ? customFeeTokenL1BalanceFloat
        : sourceNativeBalanceFloat
      : null;

    // No error while loading balance
    if (ethBalanceFloat === null) {
      return notReady();
    }

    const sendsAmount2 = Number(amount2) > 0;
    const notEnoughAmount2 = isCustomFeeToken
      ? Number(amount2) > Number(customFeeTokenL1BalanceFloat)
      : Number(amount2) > ethBalanceFloat - (estimatedL1GasFees + estimatedL2GasFees);

    if (isNaN(Number(amount)) || Number(amount) === 0) {
      return notReady({
        errorMessages: {
          inputAmount2:
            sendsAmount2 && notEnoughAmount2
              ? getInsufficientFundsErrorMessage({
                  asset: nativeCurrency.symbol,
                  chain: networks.sourceChain.name,
                })
              : undefined,
        },
      });
    }

    if (isTransferring) {
      return notReady();
    }

    if (DISABLED_CHAIN_IDS.includes(childChain.id)) {
      return notReady();
    }

    if (isDepositMode && WITHDRAW_ONLY_CHAIN_IDS.includes(childChain.id)) {
      return notReady({
        errorMessages: {
          inputAmount1: getWithdrawOnlyChainErrorMessage(childChain.name),
        },
      });
    }

    // Check if destination address is valid for ERC20 transfers
    if (destinationAddressError) {
      return notReady();
    }

    // ERC-20
    if (selectedToken) {
      const selectedTokenIsDisabled = isTransferDisabledToken(selectedToken.address, childChain.id);

      if (
        selectedRoute === 'arbitrum' &&
        isDepositMode &&
        isSelectedTokenWithdrawOnly &&
        !isSelectedTokenWithdrawOnlyLoading
      ) {
        return notReady({
          errorMessages: {
            inputAmount1: TransferReadinessRichErrorMessage.TOKEN_WITHDRAW_ONLY,
          },
        });
      } else if (selectedRoute === 'arbitrum' && selectedTokenIsDisabled) {
        return notReady({
          errorMessages: {
            inputAmount1: TransferReadinessRichErrorMessage.TOKEN_TRANSFER_DISABLED,
          },
        });
      } else if (withdrawalDisabled(selectedToken.address)) {
        return notReady();
      }

      // No error while loading balance
      if (selectedTokenBalanceFloat === null) {
        return notReady();
      }

      // Check amount against ERC-20 balance
      if (Number(amount) > selectedTokenBalanceFloat) {
        return notReady({
          errorMessages: {
            inputAmount1: getInsufficientFundsErrorMessage({
              asset: selectedToken.symbol,
              chain: networks.sourceChain.name,
            }),
            inputAmount2:
              sendsAmount2 && notEnoughAmount2
                ? getInsufficientFundsErrorMessage({
                    asset: nativeCurrency.symbol,
                    chain: networks.sourceChain.name,
                  })
                : undefined,
          },
        });
      }
    }
    // Custom fee token
    else if (isCustomFeeToken) {
      // No error while loading balance
      if (customFeeTokenBalanceFloat === null) {
        return notReady();
      }

      // Check amount against custom fee token balance
      if (Number(amount) > customFeeTokenBalanceFloat || (sendsAmount2 && notEnoughAmount2)) {
        return notReady({
          errorMessages: {
            inputAmount1:
              Number(amount) > customFeeTokenBalanceFloat
                ? getInsufficientFundsErrorMessage({
                    asset: nativeCurrency.symbol,
                    chain: networks.sourceChain.name,
                  })
                : undefined,
            inputAmount2:
              sendsAmount2 && notEnoughAmount2
                ? getInsufficientFundsErrorMessage({
                    asset: nativeCurrency.symbol,
                    chain: networks.sourceChain.name,
                  })
                : undefined,
          },
        });
      }
    }
    // ETH
    // Check amount against ETH balance
    else if (Number(amount) > ethBalanceFloat) {
      return notReady({
        errorMessages: {
          inputAmount1: getInsufficientFundsErrorMessage({
            asset: ether.symbol,
            chain: networks.sourceChain.name,
          }),
        },
      });
    }

    if (!tosAccepted) {
      return notReady();
    }

    /**
     * Lifi: Prevent bridging if the total of bridge fee, gas fee and amount are greater than the user's balance
     * This check needs to be after ERC20 check.
     * In case of insufficient balance we want to show insufficient balance error message, not gas error
     */
    if (isLifiRoute(selectedRoute)) {
      if (!selectedRouteContext) {
        return notReady();
      }

      const { amounts } = getAmountToPay(selectedRouteContext);

      const sourceNativeTokenAddress = getNativeTokenAddress(networks.sourceChain.id);
      const sourceNativeAmountToPay = formatAmountToPay(
        amounts[`${networks.sourceChain.id}:${sourceNativeTokenAddress}`],
      );
      const sourceNativeBalanceError = getInsufficientNativeBalanceErrorMessage({
        amountToPay: sourceNativeAmountToPay,
        balance: ethBalanceFloat,
        nativeCurrencySymbol: networks.sourceChain.nativeCurrency.symbol,
        chainName: networks.sourceChain.name,
      });

      if (sourceNativeBalanceError) {
        return notReady({
          errorMessages: {
            inputAmount1: sourceNativeBalanceError,
          },
        });
      }

      const destinationNativeAmountToPay = formatAmountToPay(
        amounts[
          `${networks.destinationChain.id}:${getNativeTokenAddress(networks.destinationChain.id)}`
        ],
      );
      const destinationEthBalanceFloat = destinationGasBalanceFloat;

      if (destinationNativeAmountToPay > 0 && destinationEthBalanceFloat === null) {
        return notReady();
      }

      const destinationNativeBalanceError = getInsufficientNativeBalanceErrorMessage({
        amountToPay: destinationNativeAmountToPay,
        balance: destinationEthBalanceFloat,
        nativeCurrencySymbol: networks.destinationChain.nativeCurrency.symbol,
        chainName: networks.destinationChain.name,
      });

      if (destinationNativeBalanceError) {
        return notReady({
          errorMessages: {
            inputAmount1: destinationNativeBalanceError,
          },
        });
      }

      // Check token sent balance
      const amountToSend = selectedToken?.address
        ? amounts[
            `${networks.sourceChain.id}:${normalizeAddress(selectedRouteContext.fromAmount.token.address)}`
          ]
        : undefined;
      const amountToPay = formatAmountToPay(amountToSend);

      if (selectedTokenBalanceFloat && amountToPay > selectedTokenBalanceFloat) {
        return notReady({
          errorMessages: {
            inputAmount1: getInsufficientFundsErrorMessage({
              asset: selectedToken?.symbol || nativeCurrency.symbol,
              chain: networks.sourceChain.name,
            }),
          },
        });
      }

      return ready();
    }

    // The amount entered is enough funds, but now let's include gas costs
    switch (gasSummary.status) {
      // No error while loading gas costs
      case 'loading':
        return notReady();

      case 'unavailable':
        return ready();

      case 'error':
        return notReady({
          errorMessages: {
            inputAmount1: TransferReadinessRichErrorMessage.GAS_ESTIMATION_FAILURE,
          },
        });

      case 'insufficientBalance':
        return notReady();

      case 'success': {
        if (selectedToken) {
          // If depositing into a custom fee token network, gas is split between ETH and the custom fee token
          if (isCustomFeeToken && isDepositMode) {
            // Still loading custom fee token balance
            if (customFeeTokenL1BalanceFloat === null) {
              return notReady();
            }

            // We have to check if there's enough ETH to cover L1 gas
            if (estimatedL1GasFees > ethBalanceFloat || (sendsAmount2 && notEnoughAmount2)) {
              return notReady({
                errorMessages: {
                  inputAmount1:
                    estimatedL1GasFees > ethBalanceFloat
                      ? getInsufficientFundsForGasFeesErrorMessage({
                          asset: ether.symbol,
                          chain: networks.sourceChain.name,
                          balance: formatAmount(ethBalanceFloat),
                          requiredBalance: formatAmount(estimatedL1GasFees),
                        })
                      : undefined,
                  inputAmount2:
                    sendsAmount2 && notEnoughAmount2
                      ? getInsufficientFundsErrorMessage({
                          asset: nativeCurrency.symbol,
                          chain: networks.sourceChain.name,
                        })
                      : undefined,
                },
              });
            }

            // We have to check if there's enough of the custom fee token to cover L2 gas
            if (
              estimatedL2GasFees > customFeeTokenL1BalanceFloat ||
              (sendsAmount2 && notEnoughAmount2)
            ) {
              return notReady({
                errorMessages: {
                  inputAmount1:
                    estimatedL2GasFees > customFeeTokenL1BalanceFloat
                      ? getInsufficientFundsForGasFeesErrorMessage({
                          asset: nativeCurrency.symbol,
                          chain: networks.sourceChain.name,
                          balance: formatAmount(customFeeTokenL1BalanceFloat),
                          requiredBalance: formatAmount(estimatedL2GasFees),
                        })
                      : undefined,
                  inputAmount2:
                    sendsAmount2 && notEnoughAmount2
                      ? getInsufficientFundsErrorMessage({
                          asset: nativeCurrency.symbol,
                          chain: networks.sourceChain.name,
                        })
                      : undefined,
                },
              });
            }

            return ready();
          }

          // Everything is paid in ETH, so we sum it up
          const notEnoughEthForGasFees = estimatedL1GasFees + estimatedL2GasFees > ethBalanceFloat;

          if (notEnoughEthForGasFees || (sendsAmount2 && notEnoughAmount2)) {
            return notReady({
              errorMessages: {
                inputAmount1: notEnoughEthForGasFees
                  ? getInsufficientFundsForGasFeesErrorMessage({
                      asset: ether.symbol,
                      chain: networks.sourceChain.name,
                      balance: formatAmount(ethBalanceFloat),
                      requiredBalance: formatAmount(estimatedL1GasFees + estimatedL2GasFees),
                    })
                  : undefined,
                inputAmount2:
                  sendsAmount2 && notEnoughAmount2
                    ? getInsufficientFundsErrorMessage({
                        asset: nativeCurrency.symbol,
                        chain: networks.sourceChain.name,
                      })
                    : undefined,
              },
            });
          }

          return ready();
        }

        if (isCustomFeeToken && isDepositMode) {
          // Deposits of the custom fee token will be paid in ETH, so we have to check if there's enough ETH to cover L1 gas
          // Withdrawals of the custom fee token will be treated same as ETH withdrawals (in the case below)

          // Case 1: the parent chain's native balance (eg. ETH) is not enough to cover the retryable creation fee
          if (estimatedL1GasFees > ethBalanceFloat) {
            return notReady({
              errorMessages: {
                inputAmount1: getInsufficientFundsForGasFeesErrorMessage({
                  asset: ether.symbol,
                  chain: networks.sourceChain.name,
                  balance: formatAmount(ethBalanceFloat),
                  requiredBalance: formatAmount(estimatedL1GasFees),
                }),
              },
            });
          }

          // Case 2: user has enough parent chain's native balance (eg. ETH), but doesn't have enough child-chain-native token to cover the child-chain execution cost
          if (estimatedL2GasFees > Number(customFeeTokenBalanceFloat)) {
            return notReady({
              errorMessages: {
                inputAmount1: getInsufficientFundsForGasFeesErrorMessage({
                  asset: nativeCurrency.symbol,
                  chain: networks.sourceChain.name,
                  balance: customFeeTokenBalanceFloat
                    ? formatAmount(customFeeTokenBalanceFloat)
                    : formatAmount(constants.Zero),
                  requiredBalance: formatAmount(estimatedL2GasFees),
                }),
              },
            });
          }

          return ready();
        }

        // Everything is in the same currency
        // This case also handles custom fee token withdrawals, as `ethBalanceFloat` will reflect the custom fee token balance on the Orbit chain
        const total = Number(amount) + estimatedL1GasFees + estimatedL2GasFees;

        if (total > ethBalanceFloat) {
          return notReady({
            errorMessages: {
              inputAmount1: getInsufficientFundsForGasFeesErrorMessage({
                asset: nativeCurrency.symbol,
                chain: networks.sourceChain.name,
                balance: formatAmount(ethBalanceFloat),
                requiredBalance: formatAmount(total),
              }),
            },
          });
        }

        return ready();
      }
    }
  }, [
    executionAvailable,
    gasSummary,
    selectedRoute,
    eligibleRouteTypes,
    isSmartContractWallet,
    isDepositMode,
    sourceGasBalanceFloat,
    sourceNativeBalanceFloat,
    destinationGasBalanceFloat,
    selectedTokenSourceBalanceFloat,
    customFeeTokenL1BalanceFloat,
    amount2,
    nativeCurrency.isCustom,
    nativeCurrency.symbol,
    amount,
    amountBigNumber,
    destinationToken,
    isTransferring,
    childChain.id,
    childChain.name,
    destinationAddressError,
    selectedToken,
    tosAccepted,
    networks.sourceChain.name,
    networks.sourceChain.nativeCurrency.symbol,
    networks.sourceChain.id,
    networks.destinationChain.id,
    networks.destinationChain.name,
    networks.destinationChain.nativeCurrency.symbol,
    isSelectedTokenWithdrawOnly,
    isSelectedTokenWithdrawOnlyLoading,
    selectedRouteContext,
  ]);
}
