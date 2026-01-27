import { utils } from 'ethers';
import { shallow } from 'zustand/shallow';

import { LifiCrosschainTransfersRoute } from '@/bridge/app/api/crosschain-transfers/lifi';

import { useArbQueryParams } from '../../../hooks/useArbQueryParams';
import { formatAmount } from '../../../util/NumberUtils';
import { useAmountBigNumber } from './useAmountBigNumber';
import { isLifiRoute, useRouteStore } from './useRouteStore';

/**
 * We return raw amount to be able to feed it to other calculations (like USD value)
 * Parsed amount would not work, because it format thousands with commas
 */
export function useReceivedAmount() {
  const { selectedRoute, routes, isLoading } = useRouteStore(
    (state) => ({
      selectedRoute: state.selectedRoute,
      routes: state.routes,
      isLoading: state.isLoading,
    }),
    shallow,
  );

  const [{ amount }] = useArbQueryParams();
  const amountBigNumber = useAmountBigNumber();

  if (!routes.length) {
    return {
      amount: '-',
      amountRaw: '0',
      isLoading: false,
    };
  }

  if (!selectedRoute || amountBigNumber.lte(0)) {
    const amountValue = amount || '0'; // amount can also be empty string, hence '0'
    return {
      amount: amountValue,
      amountRaw: amountValue,
      isLoading: false,
    };
  }

  const route = routes.find((r) => r.type === selectedRoute);

  if (!route) {
    return { amount, amountRaw: amount, isLoading: false };
  }

  if (isLifiRoute(route.type)) {
    const data = route.data as { route: LifiCrosschainTransfersRoute };
    const rawAmount = utils.formatUnits(
      data.route.toAmount.amount,
      data.route.toAmount.token.decimals,
    );
    return {
      amount: formatAmount(Number(rawAmount)),
      amountRaw: rawAmount,
      isLoading,
    };
  }

  return {
    amount: (route.data as { amountReceived: string }).amountReceived || amount || '0',
    amountRaw: (route.data as { amountReceived: string }).amountReceived || amount || '0',
    isLoading: false,
  };
}
