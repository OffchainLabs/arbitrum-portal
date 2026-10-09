import { BigNumber } from 'ethers';

import type { AmountWithToken, Token } from '../app/api/crosschain-transfers/types';
import { normalizeAddress } from './AddressUtils';
import type { RouteContext } from './TransferRouteUtils';

export type AmountToPay = Omit<AmountWithToken, 'amountUSD'>;

export function getAmountToPay(selectedRouteContext: RouteContext) {
  const amounts: Record<string, AmountToPay> = {};
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
    const parsedAmountUSD = Number(amountUSD ?? 0);
    fromAmountUsd += parsedAmountUSD;
    if (acc) {
      amounts[key] = {
        amount: BigNumber.from(acc.amount).add(parsedAmount).toString(),
        token,
        chainId,
      };
    } else {
      amounts[key] = {
        amount: parsedAmount.toString(),
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
    fromAmountUsd,
    toAmountUsd: Number(selectedRouteContext.toAmount.amountUSD),
  };
}
