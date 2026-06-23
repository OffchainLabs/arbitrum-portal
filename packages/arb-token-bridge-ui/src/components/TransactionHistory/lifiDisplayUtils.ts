import type { AmountWithToken } from '@/token-bridge-sdk/LifiTransferStarter';

import { formatAmount } from '../../util/NumberUtils';

const UNKNOWN_LIFI_TOKEN_SYMBOL = 'Unknown';

export function getLifiToAmountDisplay({
  isPending,
  toAmount,
}: {
  isPending: boolean;
  toAmount: AmountWithToken;
}) {
  if (
    isPending &&
    toAmount.token.symbol === UNKNOWN_LIFI_TOKEN_SYMBOL &&
    toAmount.amount.isZero()
  ) {
    return 'Pending';
  }

  return formatAmount(toAmount.amount, {
    decimals: toAmount.token.decimals,
    symbol: toAmount.token.symbol,
  });
}
