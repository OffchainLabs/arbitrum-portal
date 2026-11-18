import { BigNumber } from 'ethers';

import type { AmountWithToken } from '../../app/api/crosschain-transfers/types';
import { formatAmount } from '../../util/NumberUtils';

const UNKNOWN_LIFI_TOKEN_SYMBOL = 'Unknown';

export function getLifiToAmountDisplay({
  isPending,
  toAmount,
}: {
  isPending: boolean;
  toAmount: AmountWithToken;
}) {
  if (isPending && toAmount.token.symbol === UNKNOWN_LIFI_TOKEN_SYMBOL) {
    return 'Pending';
  }

  return formatAmount(BigNumber.from(toAmount.amount), {
    decimals: toAmount.token.decimals,
    symbol: toAmount.token.symbol,
  });
}
