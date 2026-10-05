import { BigNumber } from 'ethers';

import { addressesEqual } from '../../util/AddressUtils';
import { CommonAddress } from '../../util/CommonAddressUtils';
import type { RouteContext } from './hooks/useRouteStore';

type TokenAmounts = Pick<RouteContext, 'fromAmount' | 'toAmount'>;
type RouteTokens = Pick<RouteContext['protocolData']['route'], 'fromToken' | 'toToken'>;
type TransferWarningDialogType = 'high_slippage_warning' | 'amount_mismatch_warning';
type TransferWarningDialogParams = TokenAmounts &
  RouteTokens & {
    fromAmountUsd: number;
    toAmountUsd: number;
  };

const WARNING_THRESHOLD_PERCENTAGE = 10;

export function getAmountLoss({ fromAmount, toAmount }: { fromAmount: number; toAmount: number }) {
  const diff = fromAmount - toAmount;
  const lossPercentage = fromAmount === 0 ? 0 : Number(((diff / fromAmount) * 100).toFixed(2));

  return { diff, lossPercentage };
}

export function hasHighUsdSlippage({
  fromAmountUsd,
  toAmountUsd,
}: {
  fromAmountUsd: number;
  toAmountUsd: number;
}) {
  return (
    getAmountLoss({
      fromAmount: fromAmountUsd,
      toAmount: toAmountUsd,
    }).lossPercentage > WARNING_THRESHOLD_PERCENTAGE
  );
}

export function hasHighAmountMismatch({ fromAmount, toAmount }: TokenAmounts) {
  const parsedFromAmount = BigNumber.from(fromAmount.amount);
  const parsedToAmount = BigNumber.from(toAmount.amount);

  return parsedToAmount.mul(100).lt(parsedFromAmount.mul(100 - WARNING_THRESHOLD_PERCENTAGE));
}

export function areTokensTheSame({ fromToken, toToken }: RouteTokens) {
  if (fromToken.decimals !== toToken.decimals) {
    return false;
  }

  if (fromToken.coinKey && fromToken.coinKey === toToken.coinKey) {
    return true;
  }

  return (
    (addressesEqual(fromToken.address, CommonAddress.RobinhoodChain.VIRTUAL) &&
      addressesEqual(toToken.address, CommonAddress.Ethereum.VIRTUAL)) ||
    (addressesEqual(fromToken.address, CommonAddress.Ethereum.VIRTUAL) &&
      addressesEqual(toToken.address, CommonAddress.RobinhoodChain.VIRTUAL))
  );
}

export function getTransferWarningDialogType({
  fromToken,
  toToken,
  fromAmount,
  toAmount,
  fromAmountUsd,
  toAmountUsd,
}: TransferWarningDialogParams): TransferWarningDialogType | undefined {
  if (fromAmountUsd > 0 && toAmountUsd > 0) {
    return hasHighUsdSlippage({ fromAmountUsd, toAmountUsd }) ? 'high_slippage_warning' : undefined;
  }

  if (areTokensTheSame({ fromToken, toToken }) && hasHighAmountMismatch({ fromAmount, toAmount })) {
    return 'amount_mismatch_warning';
  }

  return undefined;
}
